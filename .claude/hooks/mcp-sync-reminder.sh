#!/bin/sh
# PostToolUse (Edit|Write): after an edit to the workout model or the MCP
# server, remind Claude that Claude Desktop only learns about it through the
# MCP server's INSTRUCTIONS and tool schemas, and needs a relaunch to see it.
f=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
case "$f" in
  *.test.ts) exit 0 ;;
  */packages/core/src/workouts/model.ts | \
  */packages/core/src/workouts/service.ts | \
  */packages/core/src/workouts/sequence.ts | \
  */apps/mcp/src/*.ts) ;;
  *) exit 0 ;;
esac
jq -n --arg f "$f" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext:
  ("You edited " + $f + ", which can change what the workouts MCP server offers Claude Desktop. Desktop sees only the server'"'"'s INSTRUCTIONS text and tool descriptions/schemas in apps/mcp/src/tools.ts (not CLAUDE.md or skills). If this change adds or changes a field, step kind or behavior a workout author should use, update StepPatchSchema / tool descriptions and INSTRUCTIONS to match, cover it in tools.test.ts, and tell Brian to quit and relaunch Claude Desktop once it is on main in the main checkout. Player-only changes need nothing.")}}'
