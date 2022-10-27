import {
  BaseSource,
  DdcOptions,
  Item,
} from "https://deno.land/x/ddc_vim@v3.0.0/types.ts";
import { Denops, fn } from "https://deno.land/x/ddc_vim@v3.0.0/deps.ts";
import { writeAll } from "https://deno.land/std@0.161.0/io/mod.ts";

type Completions = {
  completions: Completion[];
};

type Completion = {
  completion: string;
  brief_comment: string;
  signature: string;
  kind: string;
};

type Params = Record<never, never>;

export class Source extends BaseSource<Params> {
  async gather(args: {
    denops: Denops;
    options: DdcOptions;
    completeStr: string;
  }): Promise<Item[]> {
    const filename = await fn.bufname(args.denops, "%");
    const line = await fn.line(args.denops, ".");
    const column = await fn.col(args.denops, ".");
    const offset = await fn.line2byte(args.denops, line) + column - 2;
    const bufTexts = (await fn.getline(args.denops, 1, line)).slice(0, offset);
    const cmdArgs = [
      "rc",
      "--absolute-path",
      "--synchronous-completions",
      "--json",
      "-l",
      `${filename}:${line}:${column}`,
      `--unsaved-file=${filename}:${offset}`,
    ];

    let p;
    try {
      p = Deno.run({
        cmd: cmdArgs,
        stdout: "piped",
        stderr: "piped",
        stdin: "piped",
      });
    } catch (e) {
      console.error('[ddc-rtags] Run "rc" is failed');
      console.error('[ddc-rtags] "rc" binary seems not installed');
      return [];
    }

    await writeAll(p.stdin, new TextEncoder().encode(bufTexts.join("\n")));
    p.stdin.close();

    let decoded: Completions;
    const output = new TextDecoder().decode(await p.output());
    try {
      decoded = JSON.parse(output) as Completions;
    } catch (e: unknown) {
      console.error('[ddc-rtags] "rc" output is invalid');
      console.error(output);
      return [];
    }

    let candidates: Item[] = [];
    for (const completion of decoded.completions) {
      //console.log(completion);

      let candidate: Item = {
        word: completion.completion,
        kind: completion.kind,
        menu: completion.brief_comment,
      };

      if (completion.completion != completion.signature) {
        candidate.menu = completion.signature;
      }

      switch (completion.kind) {
        case "FunctionDecl":
        case "CXXMethod":
          candidate.abbr = candidate.word + "(";
          break;
      }

      candidates.push(candidate);
    }

    await p.status();

    return candidates;
  }

  params(): Params {
    return {};
  }
}
