/** `dump` extension: dump the assembled system prompt and every tool definition. */

import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Container } from "@earendil-works/pi-tui";
import { formatSize, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// A stable path so a dump is easy to reopen; the message names it and its size.
const DUMP = join(tmpdir(), "pikit-dump.md");

/** Write the live system prompt and all tool definitions to `DUMP`, returning `path (size)`. */
async function dump(pi: ExtensionAPI, ctx: ExtensionContext): Promise<string> {
  const active = new Set(pi.getActiveTools());
  const tools = pi.getAllTools();
  const lines: string[] = [
    "# pikit-dump",
    "",
    `- generated: ${new Date().toISOString()}`,
    `- model: ${ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "(none)"}`,
    `- cwd: ${ctx.cwd}`,
    `- active tools: ${[...active].join(", ") || "(none)"}`,
    "",
    "## System prompt",
    "",
    ctx.getSystemPrompt(),
    "",
    `## Tools (${tools.length})`,
    "",
  ];
  for (const tool of tools) {
    lines.push(`### ${tool.name}${active.has(tool.name) ? "" : "  (inactive)"}`, "", `- source: ${tool.sourceInfo.path}`, "", tool.description, "");
    if (tool.promptGuidelines?.length) lines.push("guidelines:", ...tool.promptGuidelines.map((g) => `- ${g}`), "");
    lines.push("parameters:", "", "```json", JSON.stringify(tool.parameters, null, 2), "```", "");
  }
  const text = lines.join("\n");
  await writeFile(DUMP, text, "utf8");
  return `${DUMP} (${formatSize(Buffer.byteLength(text))})`;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "dump",
    label: "Dump Prompt",
    description: "Dump the live system prompt and tool definitions to a tmp file and report its path; read that file for the content",
    promptSnippet: "Dump the live system prompt and tool definitions to a tmp file",
    promptGuidelines: ["Use dump to see the live system prompt and tool definitions rather than guessing."],
    parameters: Type.Object({}),
    // The custom message is the dump's only transcript row; the tool row stays empty.
    renderShell: "self",
    renderCall: () => new Container(),
    renderResult: () => new Container(),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      // The default renderer shows `[dump]` plus the markdown content, so no renderer is registered.
      pi.sendMessage({ customType: "dump", content: await dump(pi, ctx), display: true });
      return { content: [], details: undefined };
    },
  });
}
