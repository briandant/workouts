import type { Collection, Workout } from '@workouts/core';

/*
  Workouts with a collection live on their own page instead of the main list.
  `tone` is a data-tone defined in theme.css; it recolors the page, the workout's
  detail page and its player.
*/
export const COLLECTION_PAGES: Record<Collection, { path: string; name: string; tone: string }> = {
  hers: { path: '/hers', name: 'Her', tone: 'hers' },
};

/** The workouts on one page: the main list (no collection) or a collection's page. */
export const onPage = (ws: Workout[], collection?: Collection) => ws.filter((w) => w.collection === collection);

/** Where a workout lives: the page to go back to, its link text, and its tone (none for the main list). */
export function homeOf(w: Workout): { path: string; label: string; tone?: string } {
  if (!w.collection) return { path: '/', label: 'All workouts' };
  const page = COLLECTION_PAGES[w.collection];
  return { path: page.path, label: `${page.name} workouts`, tone: page.tone };
}
