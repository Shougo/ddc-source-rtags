import { type DdcOptions, type Item } from "jsr:@shougo/ddc-vim@~7.0.0/types";
import { BaseSource } from "jsr:@shougo/ddc-vim@~7.0.0/source";

import type { Denops } from "jsr:@denops/core@~7.0.0";
import * as fn from "jsr:@denops/std@~7.1.1/function";

type Completions = {
  completions: Completion[];
};

type Completion = {
  completion: string;
  brief_comment: string;
  signature: string;
  kind: string;
};

type Params = Record<string, never>;

export class Source extends BaseSource<Params> {
  override async gather(args: {
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
      "--absolute-path",
      "--synchronous-completions",
      "--json",
      "-l",
      `${filename}:${line}:${column}`,
      `--unsaved-file=${filename}:${offset}`,
    ];

    let p;
    try {
      p = new Deno.Command(
        "rc",
        {
          args: cmdArgs,
          stdout: "piped",
          stderr: "piped",
          stdin: "piped",
        },
      ).spawn();
    } catch (_e) {
      console.error('[ddc-rtags] Run "rc" is failed');
      console.error('[ddc-rtags] "rc" binary seems not installed');
      return [];
    }

    const writer = p.stdin.getWriter();
    await writer.ready;
    await writer.write(new TextEncoder().encode(bufTexts.join("\n")));
    writer.releaseLock();

    const { stdout } = await p.output();

    let decoded: Completions;
    const output = new TextDecoder().decode(stdout);
    try {
      decoded = JSON.parse(output) as Completions;
    } catch (_e: unknown) {
      console.error('[ddc-rtags] "rc" output is invalid');
      console.error(output);
      return [];
    }

    const items: Item[] = [];
    for (const completion of decoded.completions) {
      //console.log(completion);

      const candidate: Item = {
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

      items.push(candidate);
    }

    return items;
  }

  override params(): Params {
    return {};
  }
}
