import { sequence, summarize, type Workout } from '@workouts/core';
import type { Segment } from '../ui/Segments.tsx';

/** The work/rest strip for a workout card or detail page. */
export function shape(w: Workout): Segment[] {
  return sequence(w, { getReady: 0 }).map((s) => ({ weight: s.est, rest: s.kind === 'rest' }));
}

export const stats = (w: Workout) => summarize(w);
