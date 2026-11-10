import { FOCUSES, TAGS, type Focus, type Tag, type Workout } from '@workouts/core';

/* Everything a search can hit: the card's text, the tags, the equipment, and every block and move name. */
const haystack = (w: Workout) =>
  [
    w.title,
    w.summary,
    w.focus,
    w.level,
    ...(w.tags ?? []),
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


/* The tags used on these workouts, in model order (TAGS), with how many workouts have each. */
export function tagCounts(ws: Workout[]): { tag: Tag; count: number }[] {
  return TAGS.map((tag) => ({ tag, count: ws.filter((w) => hasTag(w, tag)).length })).filter((t) => t.count > 0);
}

/* True when no tag is chosen or the workout has the chosen one. */
export const hasTag = (w: Workout, tag: Tag | undefined) => !tag || (w.tags?.includes(tag) ?? false);

/* A tag from the URL, or undefined for anything that isn't one. */
export const readTag = (value: string | null): Tag | undefined => TAGS.find((t) => t === value);
