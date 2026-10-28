# Follow-along workouts

Static React workout player deployed to GitHub Pages; workouts are JSON files
in `workouts/`, edited only through the `workouts` MCP server
(`apps/mcp`, loaded via `.mcp.json`) or `WorkoutService` — never by hand.

Read `.claude/skills/writing-ui/SKILL.md` before changing code. Unless told
otherwise, develop in a git worktree, then merge into `main` and push `main`
(no PRs, no feature branches left on the remote). Run `npm run check` before
pushing; pushes to `main` deploy.
