---
name: writing-ui
description: How to build and change this workout app. Use whenever adding or changing a page, component, the player, the theme, workout data, the domain model/service in packages/core, or the MCP server in apps/mcp. Covers where code belongs, the dark + neon theme tokens, keyboard requirements, how workouts are stored and edited, and the red/green/refactor rules for NEW tests.
---

# Writing UI (Follow-along)

A static React app on GitHub Pages; workouts live as JSON in the repo and are
edited through an MCP server. No backend, no database.

## How to ship a change

Unless Brian says otherwise, every code change is made in a worktree and lands
directly on `main` — no PRs, no feature branches left on the remote:

1. Start in a git worktree (`EnterWorktree`, or
   `git worktree add .claude/worktrees/<name> -b <name>`), never in the main
   checkout.
2. Make the change, run `npm run check` until it passes, and commit.
3. Bring the branch up to date (`git fetch origin && git rebase origin/main`),
   then from the main checkout `git pull --ff-only` and
   `git merge --ff-only <branch>`, and `git push origin main`. Pushing to
   `main` deploys.
4. Delete the worktree and its branch once `main` is pushed.

Workout-only edits go through the MCP `publish` tool, which commits and pushes
the current branch; run it from the main checkout on `main` so they deploy.

## Where code goes

- `packages/core` — TypeScript, no UI. The workout domain:
  `model.ts` (zod schemas → types), `service.ts` (WorkoutService: every write),
  `serialize.ts` (canonical file format), `repository.ts` / `fs-repository.ts`
  (storage; `fs-repository` is node-only, exported from `@workouts/core/node`),
  `sequence.ts` (flatten into the player's steps, summaries, formatting).
- `apps/web` — Vite + React 19 + React Router (`HashRouter`; Pages has no SPA
  fallback) + Tailwind 4. Pages in `src/pages/`, base components in
  `src/components/ui/`, workout-specific ones in `src/components/workouts/`,
  pure player logic in `src/player/player.ts` (tested), the clock/sound/storage
  glue in `src/player/usePlayer.ts`.
- `apps/mcp` — the stdio MCP server. `tools.ts` is a thin adapter: one tool per
  WorkoutService method, input schemas built from the core zod schemas. No
  workout logic lives here.

## Workout data

- One file per workout: `workouts/<id>.json`. The web build bundles them via
  `import.meta.glob`; an invalid file fails the build and the tests.
- **Never hand-edit workout JSON.** Change workouts through the MCP tools (or
  `WorkoutService` in code). The service assigns stable slug ids, validates the
  whole workout, and writes the canonical format, so diffs stay minimal.
- Changing the model: update `model.ts`, the field lists in `service.ts`
  (`STEP_FIELDS`) and `serialize.ts` (key order), the MCP `StepPatchSchema`,
  and migrate existing files with a one-off script that goes through the service.

## Theme

- Tokens live only in `apps/web/src/styles/theme.css` (`@theme`). Use the
  generated utilities: `bg-bg`, `bg-surface`, `text-ink`, `text-muted`,
  `text-accent`, `border-line`, `font-display`, `rounded-card`… The default
  Tailwind palette is turned off; `npm run lint` rejects raw hex outside the
  theme file.
- Rest is a tone, not new colors: put `data-tone="rest"` on a subtree and
  `accent`/`bg` switch to cyan.
- Use `Button` (variant `primary|secondary|ghost`, size `md|lg|icon|icon-lg`),
  `Tag`, `Kicker`, `Stat`/`StatGrid`, `Segments`, `BigClock`, and icons via
  `<Icon as={…} />` (lucide-react). Check `/#/_styleguide` in dev.
- Mobile first: phone layout is the base; `sm:`/`lg:` widen the same route.

## Keyboard

The player is keyboard-first: Space pause/resume (Done on rep steps), ←/→
previous/next, S start the step over, R add 10 s to a rest, M sound, Esc leave, `?` the shortcut
list (`SHORTCUTS` in `PlayerPage.tsx`; keep it in step with the handler).
Every action needs a button too.

## Per-browser state

Resume point and sound preference go in localStorage via `player/storage.ts`
(every access in try/catch). Nothing else is stored client-side.

## Tests: red / green / refactor for NEW behavior

- Vitest everywhere (`npm test`; `npx vitest run <file> -t "<name>"` for one).
  Core logic gets `*.test.ts` beside it; pages are tested through
  `AppRoutes` in a `MemoryRouter` (`pages.test.tsx`); the MCP server through an
  in-memory client against a temp git repo (`tools.test.ts`).
- New behavior: write the test first, with a stub export so it fails on an
  assertion, watch it fail, then implement.
- Never edit, skip or weaken an existing test to get a red. If an existing test
  breaks, fix the code, unless the behavior it pins was deliberately changed;
  then change it in its own step and say so.

## Commands

`npm run dev` (http://localhost:5190/workouts/), `npm test`, `npm run lint`,
`npm run typecheck`, `npm run build`, `npm run check` (all of them, as CI does).
