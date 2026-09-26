---
name: firefox
description: Drive the user’s real, running Firefox — the same profile, logins and tabs — to open and read pages, click, type, run JS, screenshot and manage tabs. Attaching may restart Firefox (with -marionette), so the first command can disrupt the live session. Use when a task needs their real browser or a logged-in session.
---

# Firefox

Drive the user's real Firefox with the `ffx` helper beside this file. It attaches
geckodriver to Firefox's Marionette port with `--connect-existing`, so the browser
you control is the one they have open — same profile, cookies and logins.
Detaching never closes it.

```bash
./ffx start                        # attach (starts/restarts Firefox with -marionette if needed)
./ffx status                       # attached? current url/title/tab count
./ffx stop                         # detach (Firefox keeps running)
./ffx strategy [normal|eager|none] # page load strategy; no arg prints current

./ffx open URL                  # navigate the current tab
./ffx search QUERY              # web-search with Firefox's configured engine (new tab)
./ffx back | forward | reload
./ffx tabs                      # one line per tab: handle, title, url (tab-separated)
./ffx tab INDEX|HANDLE          # switch tab
./ffx new [URL]                 # open a new tab
./ffx close                     # close current tab (then focuses the first remaining tab)

./ffx title | url
./ffx text [SEL]                # page (or element) text
./ffx html [SEL]                # outer HTML
./ffx click SEL
./ffx type SEL TEXT             # clear, then type
./ffx key TEXT                  # type into the focused element
./ffx wait SEL [MS]             # wait for a selector (default 20s)
./ffx await JS [MS]             # block until a `return`-style JS condition is truthy
./ffx eval JS                   # run JS in the page; prints the returned value
./ffx shot [PATH]               # screenshot -> prints the PNG path
```

- Your first command may **restart Firefox** (with `-marionette`) so it can be
  attached. That is the real profile, so logins/cookies are already there.
- `-marionette` is the flag that matters — the `marionette.enabled` pref is dead.
- Before launching, `ffx` pins `remote.prefs.recommended=false`, clears Activity
  Stream test-pref leftovers and drops a leaked `focusmanager.testmode` in the live
  profile (this build's greprefs defaults the master switch to true), so a
  Marionette restart can neither blank `about:newtab` nor leave Firefox treating
  itself as focused in the background — which silently kills fcitx/ibus input.
- This is the user's live browser, not a sandbox: act conservatively. Prefer
  `text` / `eval` to read, `click` / `type` to act, and `new` a tab rather than
  hijacking the one they are looking at.
- State lives under `${XDG_CACHE_HOME:-$HOME/.cache}/pi-firefox/`: the session
  and geckodriver pid in `state`, the page load strategy in `strategy`. Every
  command validates the session and re-attaches by itself; the last-resort reset
  is to delete the `state` file.
- `close` closes the *current* tab, then focuses the first remaining one; it refuses
  to close the last tab (that would close the browser).
  - Address tabs by **handle**, not index — indexes shift as tabs open.
  - Check `url` before you close.
- `search` asks Firefox itself for the results (`firefox --search`), so it uses the
  engine the user configured. It focuses the new results tab and prints its URL;
  read it with `text`/`eval` as usual.
- The session uses a **non-blocking page load strategy**:
  - Navigation (`open`, `back`, `forward`, `reload`) defaults to `eager`, which
    returns at `DOMContentLoaded` so the DOM is readable while images and scripts
    still load — `normal` would instead block on the full `load` event.
  - `ffx strategy none` returns before the navigation even commits, so a following
    `text` can still see the previous page; `ffx strategy normal` restores the
    full wait.
  - The strategy is fixed at session creation, so changing it rebuilds the session;
    geckodriver applies it on a `--connect-existing` attach too.
  - To wait for everything, use `ffx await 'return document.readyState === "complete"'`.
- `wait` / `await` do their waiting **inside the page** via one WebDriver async
  request — never wrap `ffx` in a sleep loop. Both exit non-zero on timeout. Use
  `await` for anything a selector can't express (e.g. `ffx await 'return !!document.querySelector(".done")'`).
- `type` clears the field first and falls back to select-all + delete if the widget
  ignores `clear()`, so it replaces rather than silently appending.
- `url` / `title` / `text` / `html` print raw; `eval` / `await` print JSON, so their
  strings come back quoted. `text SEL` / `html SEL` return only the **first** match.
- Selectors are plain CSS `querySelector`, so `[type=…]` tests the *attribute* —
  prefer `input[name=…]`, since many widgets only have the type *property*. Window
  handles are per-session; don't cache them across runs.
- `eval` is the escape hatch for anything the CLI lacks; for anything below that,
  every WebDriver endpoint is reachable at `http://127.0.0.1:4444/session/<id>`.
