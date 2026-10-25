# Follow-along

A workout follow-along player: pick a workout, hit start, and it counts you
through every interval, set and rest. Dark, high-contrast, readable from across
the room. Built from a Claude Design prototype (`docs/design/`).

## How it works

- **Workouts are files.** Each workout is `workouts/<id>.json` in this repo.
  There's no database: git is the storage and the history.
- **Pushing to `main` deploys.** A GitHub Action lints, tests, builds and
  publishes the app to GitHub Pages.
- **Claude edits the workouts.** The `workouts` MCP server gives Claude typed
  tools (`create_workout`, `add_steps`, `update_step`, `replace_step`,
  `move_step`, `preview_workout`, `publish`, …). Every change goes through a
  validated service layer that writes a canonical file format, so Claude never
  writes JSON by hand. `publish` commits `workouts/` and pushes, which
  redeploys.

## Editing workouts with Claude

**Claude Code:** the repo's `.mcp.json` registers the server. Open Claude Code
in this folder and approve the `workouts` server when asked.

**Claude Desktop:** run

```sh
npm run mcp:install-desktop   # or: npm run mcp:desktop-config to print the entry
```

then restart Claude Desktop. The entry uses absolute paths to this checkout and
your Node binary.

Then ask things like *"Add a 20-minute core workout for beginners"*, *"Swap the
plank in Bodyweight Rounds for a side plank"*, or *"Make Tabata 10 rounds"*.
Claude edits, checks the timing with `preview_workout`, and publishes when
you're happy.

## Workout model

A workout has blocks (Warm-up, Main set…; a block can repeat for `rounds` with
`restBetweenRounds`). Blocks hold steps:

| kind    | fields                                                        |
| ------- | ------------------------------------------------------------- |
| `timed` | `name`, `duration` (s)                                         |
| `reps`  | `name`, `reps` (tap Done to advance)                           |
| `sets`  | `name`, `sets`, `reps` or `duration`, optional `rest` between |
| `rest`  | `duration`                                                     |

Named steps can also have `cue`, `perSide` and `video` (YouTube or .mp4 URL).
The schema lives in `packages/core/src/workouts/model.ts`.

## Development

```sh
npm install
npm run dev        # http://localhost:5190/workouts/
npm test
npm run check      # lint + typecheck + tests + build, as CI runs
```

Layout: `packages/core` (domain + service), `apps/web` (the app),
`apps/mcp` (the MCP server). See `.claude/skills/writing-ui/SKILL.md`.

Player keys: Space pause/Done · ←/→ step · R +10 s rest · M sound · Esc leave · ? help.
