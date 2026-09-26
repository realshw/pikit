/** `memory` extension: the always-on memory. */

import { glob, readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

// The memory repo is user data, kept outside the package tree at `<agent-dir>/memory`
// so `pi update`'s reset/clean never touches it.
const MEMORY = join(getAgentDir(), "memory");

// Every `AGENTS.md` in the memory repo is always in context, each emitted as-is
// and relying on its own `# Title`; the skill enforces that.
async function findUnits(dir: string): Promise<string[]> {
  // `glob` skips dotfiles by default and returns paths relative to `cwd`.
  const found: string[] = [];
  for await (const path of glob("**/AGENTS.md", { cwd: dir })) found.push(path);
  return found;
}

async function readMemory(dir: string): Promise<string | undefined> {
  const units = await findUnits(dir);
  // The frame comes first — `self/`, then `user/` — everything else in byte
  // order. Default `sort()` is byte order, not locale order: the snapshot must
  // read the same on every machine.
  const frame = ["self/AGENTS.md", "user/AGENTS.md"].filter((path) => units.includes(path));
  const rest = units.filter((path) => !frame.includes(path)).sort();
  const ordered = [...frame, ...rest];
  const blocks: string[] = [];
  for (const path of ordered) {
    try {
      const content = (await readFile(join(dir, path), "utf8")).trim();
      if (content) blocks.push(content);
    } catch {
      // Skip an unreadable unit.
    }
  }
  return blocks.length > 0 ? blocks.join("\n\n") : undefined;
}

export default function (pi: ExtensionAPI) {
  // Snapshot at session start so the prompt is stable for the whole session:
  // memory edits land next session (or on reload), never mid-turn.
  let snapshot: string | undefined;

  pi.on("session_start", async () => {
    snapshot = await readMemory(MEMORY);
  });

  pi.on("before_agent_start", (event) => {
    // Pi diffs sections and patches only what changed, so a stable snapshot
    // costs nothing after the first turn.
    if (snapshot) event.systemPromptOptions.sections.memory = snapshot;
  });

  // Pull only; the user reloads when ready, so the reload does not swallow the result.
  pi.registerCommand("mem-pull", {
    description: "Pull the memory repo",
    handler: async (_args, ctx) => {
      ctx.ui.notify("pulling memory", "info");
      const result = await pi.exec("git", ["-C", MEMORY, "pull", "--rebase", "--autostash"]);
      if (result.code !== 0) {
        ctx.ui.notify(`memory pull failed (exit ${result.code})`, "error");
        return;
      }
      ctx.ui.notify("memory pulled", "info");
    },
  });
}
