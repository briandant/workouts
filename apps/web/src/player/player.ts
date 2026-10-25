import type { PlayStep } from '@workouts/core';

/* The player as a pure state machine; usePlayer drives it with a clock. */

export interface PlayerState {
  idx: number;
  /** Time left on a timed step. */
  remainingMs: number;
  /** Time spent on a rep step. */
  stepElapsedMs: number;
  elapsedMs: number;
  paused: boolean;
  finished: boolean;
}

/** Sounds to play: a short count on the last 3 seconds, a long tone when a step ends. */
export type Cue = 'count' | 'end';

const durationMs = (st: PlayStep | undefined) => (st?.duration ?? 0) * 1000;
export const isRest = (st: PlayStep | undefined) => st?.kind === 'rest' || st?.kind === 'prep';

export function initial(
  steps: PlayStep[],
  { idx = 0, elapsedMs = 0, paused = false }: { idx?: number; elapsedMs?: number; paused?: boolean } = {},
): PlayerState {
  const i = Math.min(Math.max(0, idx), Math.max(0, steps.length - 1));
  return { idx: i, remainingMs: durationMs(steps[i]), stepElapsedMs: 0, elapsedMs, paused, finished: false };
}

export function goTo(s: PlayerState, steps: PlayStep[], i: number): PlayerState {
  if (i >= steps.length) return { ...s, finished: true, paused: false };
  const idx = Math.max(0, i);
  return { ...s, idx, remainingMs: durationMs(steps[idx]), stepElapsedMs: 0, finished: false };
}

export function tick(s: PlayerState, steps: PlayStep[], dtMs: number): { state: PlayerState; cues: Cue[] } {
  const st = steps[s.idx];
  if (s.paused || s.finished || !st) return { state: s, cues: [] };
  const elapsedMs = s.elapsedMs + dtMs;
  if (st.kind === 'reps') return { state: { ...s, elapsedMs, stepElapsedMs: s.stepElapsedMs + dtMs }, cues: [] };

  const remainingMs = s.remainingMs - dtMs;
  if (remainingMs <= 0) return { state: goTo({ ...s, elapsedMs }, steps, s.idx + 1), cues: ['end'] };
  const before = Math.ceil(s.remainingMs / 1000);
  const after = Math.ceil(remainingMs / 1000);
  const cues: Cue[] = after !== before && after >= 1 && after <= 3 ? ['count'] : [];
  return { state: { ...s, elapsedMs, remainingMs }, cues };
}

export const togglePause = (s: PlayerState): PlayerState => ({ ...s, paused: !s.paused });

/** Mark a rep step done (or skip ahead) and keep going. */
export const done = (s: PlayerState, steps: PlayStep[]): PlayerState => goTo({ ...s, paused: false }, steps, s.idx + 1);

export function addRest(s: PlayerState, steps: PlayStep[], ms = 10_000): PlayerState {
  return isRest(steps[s.idx]) ? { ...s, remainingMs: s.remainingMs + ms } : s;
}

/** Seconds left in the workout, estimating rep steps. */
export function timeLeft(s: PlayerState, steps: PlayStep[]): number {
  const st = steps[s.idx];
  if (!st) return 0;
  let left = st.kind === 'reps' ? Math.max(0, st.est - s.stepElapsedMs / 1000) : s.remainingMs / 1000;
  for (let i = s.idx + 1; i < steps.length; i++) left += steps[i]!.est;
  return left;
}

/** 0–1 through the current step. */
export function stepProgress(s: PlayerState, steps: PlayStep[]): number {
  const st = steps[s.idx];
  if (!st) return 0;
  const p = st.kind === 'reps' ? s.stepElapsedMs / 1000 / st.est : 1 - s.remainingMs / durationMs(st);
  return Math.max(0, Math.min(1, p));
}
