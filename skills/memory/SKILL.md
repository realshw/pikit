---
name: memory
description: Bootstrap, maintain and publish the user’s long-term memory — a git-versioned tree of AGENTS.md notes always in context. Write each durable fact into its unit, keep it lean, and publish with git. Use when saving a durable fact about the user, or maintaining their memory repo.
---

# Memory

The user’s long-term memory is a git repo at `$PI_CODING_AGENT_DIR/memory`
(`~/.pi/agent/memory` when that is unset). Every `AGENTS.md` in it is always in
context — every session. This skill covers **writing**, **bootstrapping** and
**maintaining** it.

## Layout

```
memory/
├── self/AGENTS.md          who the agent is: voice, values      (in context first)
├── user/AGENTS.md          who the user is, how we work         (in context second)
└── <room>/AGENTS.md        what the agent knows                 (in context sorted)
```

Only `self/` and `user/` are fixed; the agent places every other unit anywhere
under the repo root, naming each for its domain. Units reach context in order —
`self/`, then `user/`, then the rest sorted by path — and each unit’s `# Title`
heading is its name in context. Open a room for each part of the user’s life the
agent needs, adding units freely as they arise.

## Writing a fact

A durable fact is written straight into the unit it belongs to, with the ordinary
`read` / `edit` / `write` tools. A fact stands on its own, without reference to
what came before it, and a lesson carries its rationale. Fold it into the unit
that already covers its domain, or open a new room for a new one.

## Commands

The repo is ordinary git. Set `MEMORY` and address it:

```bash
MEMORY="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}/memory"
git -C "$MEMORY" pull --rebase --autostash   # update from the upstream
git -C "$MEMORY" add -A                      # stage everything
git -C "$MEMORY" commit -m MSG               # commit
git -C "$MEMORY" push                        # publish
git -C "$MEMORY" status --short --branch     # repo, branch, pending changes
```

`push` never pulls, so if the upstream moved, pull first.

A write is saved at once but enters context only at the next `session_start` — a
new session, a resume, or a reload.

## Bootstrap

Create the repo and scaffold the frame: `mkdir -p "$MEMORY" && git -C "$MEMORY"
init -b master`, then write `self/AGENTS.md` — who the agent is and how they work,
keeping the pointer to this `memory` skill — and `user/AGENTS.md` — who the user
is and how you work together — and commit. Open the first units from there. To
give the memory an upstream, add one in a separate step with `git remote add` and
`git push -u` (or `gh`).

## Defrag and sync

Pull before editing, run the defrag pass from the pikit skill
(`../pikit/SKILL.md`) over `$MEMORY`, then commit and push.
