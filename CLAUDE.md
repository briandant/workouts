# Follow-along workouts

Static React workout player deployed to GitHub Pages; workouts are JSON files
in `workouts/`, edited only through the `workouts` MCP server
(`apps/mcp`, loaded via `.mcp.json`) or `WorkoutService` — never by hand.

Read `.claude/skills/writing-ui/SKILL.md` before changing code. Unless told
otherwise, develop in a git worktree, then merge into `main` and push `main`
(no PRs, no feature branches left on the remote). Run `npm run check` before
pushing; pushes to `main` deploy.

Claude Desktop runs the same MCP server straight from the main checkout and
knows only its `INSTRUCTIONS` and tool schemas (`apps/mcp/src/tools.ts`), not
this file or the skills. When a change affects what a workout author can do
(new field, step kind, behavior), update those too: tests in `apps/mcp` fail
when they fall behind the model, and a `PostToolUse` hook
(`.claude/hooks/mcp-sync-reminder.sh`) reminds you. Desktop picks it up after
the change is on `main` in the main checkout and Desktop is quit and relaunched.
