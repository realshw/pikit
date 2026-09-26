# pikit

A bundle of [pi](https://pi.dev) extensions and skills, installed together.

## Install

```bash
pi install git:github.com/realshw/pikit
```

Use `pi config` to enable or disable individual extensions and skills.

## Extensions

- **bash** — the built-in `bash` tool with a required `summary` paragraph. Collapsed,
  the transcript shows the paragraph and hides the result; expanded, it shows the
  raw command and output as usual.
- **dump** — a `dump` tool that writes the live system prompt and every tool
  definition to `$TMPDIR/pikit-dump.md`, showing the path and size as a message.
  For inspecting what a request really contains without grepping the session
  log.
- **memory** — always-on long-term memory. The `memory` skill writes durable
  facts straight into `AGENTS.md` units that every session carries in context. The
  repo lives outside the package, at `<agent-dir>/memory`, and pushes to its own
  remote; the `/mem-pull` command pulls it, and a reload brings the new facts
  into context.
- **reload** — a `reload` tool that lets the model reload the runtime (extensions,
  skills, prompts, themes and context files) after editing them, then resumes it with
  a fresh turn.

## Skills

- **android** — on-device Android development on rooted aarch64 Termux:
  `aapt2 → javac → d8 → apksigner`, then `pm install`. No Gradle, no adb. See
  [`skills/android/SKILL.md`](skills/android/SKILL.md).
- **exa** — web search and page fetch through [Exa](https://exa.ai)'s MCP
  endpoint: `exa search`, `exa fetch`, `exa raw`. Config: `EXA_API_KEY` lifts the
  free-tier rate limit. See [`skills/exa/SKILL.md`](skills/exa/SKILL.md).
- **firefox** — drive the user's real, running Firefox through geckodriver
  (`--connect-existing`), so the agent browses the same profile, logins and tabs:
  open/read pages, click, type, run JS, screenshot, manage tabs. See
  [`skills/firefox/SKILL.md`](skills/firefox/SKILL.md).
- **memory** — bootstrap and maintain the always-on memory repo, an `AGENTS.md`
  tree at `<agent-dir>/memory`. See
  [`skills/memory/SKILL.md`](skills/memory/SKILL.md).
- **pikit** — extend pi itself: choose between a pi extension and a skill + CLI,
  hook pi's runtime (tool rendering, system-prompt sections), and keep tools and
  prompt sections lean. The guidelines live in pikit. See
  [`skills/pikit/SKILL.md`](skills/pikit/SKILL.md).
- **qualcomm** — inspect a Qualcomm SoC at runtime with `icc`: live per-node
  interconnect bandwidth votes, client drill-down, and the SMMU/IOMMU map. See
  [`skills/qualcomm/SKILL.md`](skills/qualcomm/SKILL.md).
- **tmux** — drive named tmux sessions with the `ttx` helper (spawn detached,
  type, read, kill) and open a visible terminal attached to one. See
  [`skills/tmux/SKILL.md`](skills/tmux/SKILL.md).

## Dev

```bash
npm install
npm run check    # prettier --check + typecheck
npm run format   # prettier autofix
```

Work lands on `master`; a clean `npm run check` is required.
