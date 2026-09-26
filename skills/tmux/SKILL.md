---
name: tmux
description: Drive named tmux sessions with a helper CLI and open a visible terminal attached to one — spawn a detached session, type into it, read its output, tear it down, and pop a window the user can watch. Use when work needs an interactive terminal the agent can drive or the user should see.
---

# tmux sessions

Drive named tmux sessions with the `ttx` helper that sits next to this file, and
open a real terminal window when the user should see or type into a session.
Keep track of every session name yourself.

```bash
./ttx spawn NAME [--cwd DIR] [cmd...]   # create a detached session
./ttx send  NAME 'text'                 # type + Enter
./ttx type  NAME 'text'                 # type, no Enter
./ttx key   NAME C-c                    # send a key (Ctrl-C, Up, Escape, ...)
./ttx recv  NAME [lines]                # last N non-blank lines (default 40; physical, so wraps count)
./ttx ls                                # list sessions
./ttx kill  NAME                        # tear down
./ttx attach NAME                       # open a window attached to it
```

- Always spawn **detached**; never hijack a session the user is in.
- Names are `[A-Za-z0-9_-]+` — no dots or colons, since tmux reads those as target
  separators — and they are matched **exactly**: a stale or mistyped name never
  falls back to a different session that starts with the same prefix.
- `attach` takes the desktop path first:
  - With a graphical session (`DISPLAY`/`WAYLAND_DISPLAY`) it opens
    `mate-terminal` when installed, else `xterm`.
  - With no display, or neither binary installed, it falls back to a new **Termux
    tab** via an Android intent when running inside Termux
    (`TERMUX_VERSION`/`TERMUX_APP_PID`/`PREFIX`); otherwise it tells the user to
    run `tmux attach -t NAME`.
- `attach`'s chain is deliberately short and fixed — don't broaden it to a
  generic emulator list; launch flags differ per terminal and the set is
  unbounded.
- When the spawned command is a finite script, the session closes when it exits,
  so attach in the same command while it runs — a later `ttx attach` finds no
  session.
- For anything `ttx` doesn't cover, call `tmux` directly.
