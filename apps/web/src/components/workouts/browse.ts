import { FOCUSES, type Focus, type Workout } from '@workouts/core';

/* Everything a search can hit: the card's text, the equipment, and every block and move name. */
const haystack = (w: Workout) =>
  [
    w.title,
    w.summary,
    w.focus,
    w.level,
    ...(w.equipment ?? []),
    ...w.blocks.flatMap((b) => [b.name, ...b.steps.map((s) => (s.kind === 'rest' ? '' : s.name))]),
  ]
    .join('\n')
    .toLowerCase();

/* True when every whitespace-separated word of the query appears somewhere in the workout. */
export function matches(w: Workout, query: string): boolean {
  const text = haystack(w);
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((term) => text.includes(term));
}

/* Workouts by focus, in model order (FOCUSES); focuses with no workouts are left out. */
export function groupByFocus(ws: Workout[]): { focus: Focus; workouts: Workout[] }[] {
  return FOCUSES.map((focus) => ({ focus, workouts: ws.filter((w) => w.focus === focus) })).filter(
    (g) => g.workouts.length > 0,
  );
}
