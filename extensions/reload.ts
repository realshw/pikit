/** `reload` extension: let the model reload the runtime and resume. */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Container } from "@earendil-works/pi-tui";
import { Type } from "typebox";

interface ReloadState {
  /** True while a reload the model asked for is waiting to be dispatched. */
  dispatch: boolean;
  /** True while a reload the model asked for still owes a resume turn. */
  resume: boolean;
}

// A reload replaces the extension runtime, so the flags that must survive it live
// on `globalThis`, namespaced to this extension.
const KEY = "pikit.reload";
const store = globalThis as unknown as Record<string, ReloadState | undefined>;
const state = (store[KEY] ??= { dispatch: false, resume: false });

export default function (pi: ExtensionAPI) {
  // The tool cannot call ctx.reload() — only a command handler can, and commands
  // run immediately even mid-stream. So it stages a reload, and this dispatches the
  // command once the turn settles and the runtime is idle.
  pi.on("agent_settled", () => {
    if (!state.dispatch) return;
    state.dispatch = false;
    pi.sendUserMessage("/nudged-reload", { expandPromptTemplates: true });
  });

  // The reload tears down this extension and loads it again, so the resume turn is
  // started from the fresh runtime. An empty user message reaches `prompt()`, which
  // emits `before_agent_start` and re-injects every prompt section; it renders no row,
  // so the model resumes from the transcript.
  pi.on("session_start", (event) => {
    if (event.reason !== "reload" || !state.resume) return;
    state.resume = false;
    pi.sendUserMessage("");
  });

  pi.registerCommand("nudged-reload", {
    description: "Reload the runtime and resume",
    handler: async (_args, ctx) => {
      // `ctx.reload()` invalidates this runtime, so the resume turn is sent from
      // the fresh runtime's `session_start`; the command owns the flag it reads.
      state.resume = true;
      await ctx.reload();
    },
  });

  pi.registerTool({
    name: "reload",
    label: "Reload Runtime",
    description: "Reload the agent runtime",
    promptSnippet: "Reload the agent runtime",
    promptGuidelines: ["After editing any pi extension, skill, prompt, theme or context file, call reload so the change takes effect and the turn resumes."],
    parameters: Type.Object({}),
    // The reload is a state change, not an event: it earns no transcript row.
    renderShell: "self",
    renderCall: () => new Container(),
    renderResult: () => new Container(),
    async execute() {
      state.dispatch = true;
      return {
        content: [],
        details: undefined,
        terminate: true,
      };
    },
  });
}
