/** `bash` extension: the built-in bash tool, with a brief paragraph shown while collapsed. */

import type { BashToolDetails, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createBashToolDefinition, defineTool } from "@earendil-works/pi-coding-agent";
import { Container, Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

/** The renderer state the built-in call/result renderers keep per tool row. */
interface BashState {
  startedAt: number | undefined;
  endedAt: number | undefined;
  interval: NodeJS.Timeout | undefined;
}

export default function (pi: ExtensionAPI) {
  const original = createBashToolDefinition(process.cwd());

  // Add `brief` ahead of the built-in `command`/`timeout`, whose descriptions,
  // types and optionality carry over unchanged.
  const bashParams = Type.Object({
    brief: Type.String({ description: "Short paragraph briefing what the command will do" }),
    ...original.parameters.properties,
  });

  pi.registerTool(
    defineTool<typeof bashParams, BashToolDetails | undefined, BashState>({
      ...original,
      parameters: bashParams,
      // The built-in's type binds `prepareArguments` to its own schema; ours has `brief`.
      prepareArguments: undefined,
      async execute(toolCallId, params, signal, onUpdate, ctx) {
        return original.execute(toolCallId, { command: params.command, timeout: params.timeout }, signal, onUpdate, ctx);
      },
      // Collapsed, the row is the paragraph; expanded, the built-in command and
      // output take over, as though the paragraph did not exist.
      renderCall(args, theme, context) {
        const state = context.state;
        if (context.executionStarted && state.startedAt === undefined) {
          state.startedAt = Date.now();
          state.endedAt = undefined;
        }
        if (context.expanded) return original.renderCall!(args, theme, context);
        // Args stream in, so the brief may not have arrived yet.
        const brief = args.brief ? theme.fg("accent", args.brief) : theme.fg("toolOutput", "...");
        const text = theme.fg("toolTitle", theme.bold(`${original.label} `)) + brief;
        return new Text(text, 0, 0);
      },
      renderResult(result, options, theme, context) {
        if (options.expanded) {
          // A fresh component: the shared `lastComponent` from the collapsed render
          // is not a shell result component.
          return original.renderResult!(result, options, theme, { ...context, lastComponent: undefined });
        }
        const state = context.state;
        if (state.interval) {
          clearInterval(state.interval);
          state.interval = undefined;
        }
        return new Container();
      },
    }),
  );
}
