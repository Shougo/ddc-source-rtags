# ddc-rtags

rtags completion for ddc.vim

This source collects candidates from rtags.

## Required

### denops.vim

https://github.com/vim-denops/denops.vim

### ddc.vim

https://github.com/Shougo/ddc.vim

### rtags

https://github.com/Andersbakken/rtags

Note: You need to lunch "rdm" command in the background.

## Configuration

```vim
" Use rtags source.
call ddc#custom#patch_global('sources', ['rtags'])

" Change source options
call ddc#custom#patch_global('sourceOptions', {
      \ 'rtags': {
      \   'mark': 'R',
      \   'dup': v:true,
      \   'forceCompletionPattern': '\.\w*|:\w*|->\w*' },
      \ })
```
