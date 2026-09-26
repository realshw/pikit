---
name: pikit
description: Extend pi — choose between a pi extension and a skill + CLI, hook pi’s runtime (lifecycle hooks, tool rendering, the mutation queue, system-prompt sections), and keep tools and prompt sections lean. Follows the pikit repository conventions. Use when adding or editing a pi extension, skill or CLI, or when deciding how a new pi capability should ship.
---

# Extending pi

Our guidelines for extending pi itself — how a new capability should ship, how
to hook pi’s runtime, and how to keep tools and prompt sections lean. They live
in pikit, the monorepo that bundles our extensions and skills, so its repository
conventions below are the concrete home: extensions are single files under
`extensions/`; skills are `skills/<name>/SKILL.md` with an extensionless CLI
beside them when the work is shell-drivable. Pi loads each skill’s name,
description and location at startup, and its body on demand — so a body edit
takes effect at once, while a name or description edit waits for a reload. A
clean `npm run check` is required, and work lands on `master`.

## Ship an extension, or a skill + CLI?

An extension only when the capability crosses pi’s runtime boundary — lifecycle
hooks, system-prompt injection, a built-in tool override, TUI state, the reload
API, or a command. Registering a tool is not itself a reason: a tool whose whole
contract is arguments in, text out is shell-drivable, so it belongs in a skill +
CLI.

## Skills and CLIs

A skill documents its CLI’s contract and a one-line raw escape hatch for anything
the CLI does not cover.
- Keep its shell blocks valid — `bash -n` them — with no bare `<angle>` placeholders
  and trailing comments aligned.
- State what is; keep to the fact, not the mechanism behind it, and use a
  negative only as a prohibition that stops a plausible wrong action, never to
  describe the design’s absence.
- Don’t autodetect an unbounded set of external programs: their flags differ, so
  hardcode the known daily driver instead of probing.
- A shell helper prefixes its errors with its own name (`exa:`); a tool result does
  not, since its thrown error already reaches the model as ordinary tool text, so
  the message must explain itself.

## Extensions

An extension’s entrypoint is an anonymous default export — `export default
function (pi: ExtensionAPI)` — since `default` already names it. Namespace shared
`globalThis` state per extension.

Helpers can live in a subdirectory: pi loads one only when it carries an
`index.ts`, so a plain subdir is skipped, and a `.ts` import specifier needs
`allowImportingTsExtensions` in the tsconfig.

Keep the factory free of processes, sockets, watchers and timers: some loads
never start a session.
- Start a long-lived resource from `session_start`, and release it in an
  idempotent `session_shutdown`.
- A reload replaces the runtime, so code after `await ctx.reload()` must not
  reuse old-runtime state.

## Tools

- Name a tool in one word, and put each rule where it acts:
  - The input shape goes in the parameter description, a lesson in
    `promptGuidelines`, a hard limit in tool validation — never restated in prose.
  - The description carries the what and a trigger-led `promptGuidelines` the when;
    a `promptSnippet` surfaces it. The snippet lands in the system prompt’s
    `<tools>` list, the description in the provider’s tool JSON — separate request
    regions, so echoing is pi’s convention, not duplication.
  - Keep the guideline a ~50-character trigger and the description to what its
    parameters cannot say; both are paid for every request.
- Name the prompt trigger after an action the agent already performs, not a
  property it must predict: “before you act” reads as a significant act, so
  read-only calls slip past; “before any other tool call” catches them.
- A caller’s choice belongs in the schema as a required parameter, not as a
  default in the code, so an omission is a schema error rather than a convention.
- A long tool result goes to a file whose path is returned, the way pi’s bash
  truncation does: the inline part is capped, and nothing is dropped silently.
- Wrap an MCP server with a few compact tools, never its verbose metadata,
  keeping its provider prefix.
- Use pi’s own nouns in what a tool declares: system prompt and tool definitions,
  never tool schema.
- A tool’s name and its rendering are one decision:
  - An event earns a transcript row; a state channel hides its row — it is named
    for the state, and the line it sets is its whole surface.
  - Agent state belongs in that line (`setWorkingMessage`), not a widget, which
    persists past the run and competes with the live line.
- A tool that reads and rewrites a file goes through pi’s per-file mutation queue;
  sibling tool calls run in parallel by default, so a bare read-modify-write loses
  an update.
- A tool that must not overlap its siblings sets `executionMode: "sequential"`;
  one sequential call runs the whole batch one at a time.
- Override a built-in tool only when a sentence beats the row it already shows;
  wrap built-ins only. A custom tool already authors its own row, and refitting a
  built-in whose renderer frames its own row means rebuilding it.

## System-prompt sections

A section lives in the system prompt, not only in the tool call that set it. An
extension that owns one rebuilds branch-derived state on `session_start` and
`session_tree`, re-injects the section on `before_agent_start` each turn so the
model holds the current value against drift, and sets the working line on
`agent_start` when the section has one. The state stays until the agent replaces
it; state held only in the extension or read from disk has no branch to rebuild
from.

## Defragging knowledge

A memory unit and a skill doc are both curated markdown, so one pass keeps them
terse and current. Memory is paid for every session; a skill pays its description
every session and its body on load — so compact in proportion to what each
surface costs.

- **Verify** — check each fact against its source (the repo, the machine, the
  command), not merely against the rest of the knowledge, so a fact that has
  quietly stopped being true is caught rather than trusted.
- **Hygiene** — dedupe, resolve contradictions, and delete what has gone stale,
  editing any file directly.
- **Restructure** — route each fact to the surface that owns its domain, opening
  a unit or section when a domain outgrows one and closing what its facts have
  left:
  - An always-on fact goes to memory, a capability loaded on demand to a skill.
  - A fact a skill already states at the same level comes out of memory; a skill’s
    concrete instance and memory’s general discipline are different facts, so both
    stand.
  - A skill is public, so folded knowledge carries no names, email, hostnames,
    paths or machine identifiers, which stay in memory. The agent cannot run a user
    command, so a skill documents the CLI it runs, never the prompt command the
    user types.
- **Compact** — tighten copy and keep it bounded:
  - Drop what is stated twice, and shorten overlong prompt text — memory prose, a
    skill’s description, a tool’s prompt-facing strings.
  - Break a long statement into nested bullets, one clause per line.
  - State only what can be bounded: a claim about a configuration cannot be, so
    give the remedy keyed to its symptom; a mechanism can be, so state it
    outright.
- **Sync** — pull before editing and push after, so parallel work is never
  clobbered.

## pikit repository conventions

- The README lists every extension and skill, so adding or removing one updates it
  in the same change.
- A code repo carries no `AGENTS.md` and no `.npmrc`, and git-ignores its
  `package-lock.json`; the author’s name appears only in the git author,
  `package.json`, and the license.
- `npm run check` is `prettier --check .` then `tsc --noEmit`, and runs where the
  edit is:
  - Prettier is the formatter because Biome has no Termux (bionic) binary;
    two-space indent, `{ "printWidth": 160 }`.
  - Prettier covers only TypeScript and JSON — the shell CLIs stay hand-formatted
    with tabs, and markdown stays as authored to keep `*emphasis*` over
    Prettier’s `_`.
- Every peer dependency (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`,
  `typebox`) is also a dev dependency so `tsc` resolves it on every machine.
- Prefer 0BSD (Zero-Clause BSD), `Copyright (c) <year> <holder>`.
- A thrown `Error` message starts lowercase.

## Traps

- A typebox union built from a mapped array collapses to one literal; write the
  literals out and take the type with `Static<typeof schema>`.
- Pi XML-escapes skill descriptions, so a `'` in one must be written as ’.
- A built-in definition's type binds `prepareArguments` to the built-in's own
  schema, so an override that replaces `parameters` sets `prepareArguments:
  undefined` to type-check; only `edit` implements one at runtime.
- When a built-in's `renderResult` takes over the expanded branch, pass it
  `lastComponent: undefined`: the collapsed branch left a different component in
  the slot, so the built-in would reuse it as its own.
- `ctx.ui.setWorkingMessage` writes instance state that outlives a run — pi resets
  it only on a full UI reset — so derive the line on `agent_start`: it fires on
  every run path, before the working row, and needs no settle handler. Deriving it
  on `before_agent_start` misses runs that skip `prompt()`.
- `ctx.reload()` runs only from a command handler — a tool cannot call it — so a
  tool stages the request and an `agent_settled` handler dispatches the command
  once the turn ends.
- `sendMessage` with `triggerTurn` runs the agent directly, skipping
  `before_agent_start`, so a resume sent that way skips every prompt-section
  re-injection for that turn.
  - Resume with `sendUserMessage`, which goes through `prompt()`.
  - Empty user text starts the turn and renders no row, so the model resumes from
    the transcript.
