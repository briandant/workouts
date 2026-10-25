import type { Step, Workout } from './model.ts';

/** One thing the player shows: a work interval, a rep target, a rest, or the get-ready countdown. */
export interface PlayStep {
  kind: 'prep' | 'work' | 'reps' | 'rest';
  name: string;
  /** Seconds for timed kinds; null for reps (tap Done to advance). */
  duration: number | null;
  reps?: number;
  perSide?: boolean;
  cue?: string;
  video?: string;
  block: string;
  round: number;
  rounds: number;
  set: number;
  sets: number;
  /** Estimated seconds, used for progress and time-left. */
  est: number;
}

export interface SequenceOptions {
  /** Get-ready countdown before the first step, in seconds. 0 for none. */
  getReady?: number;
  /** Used to estimate how long a rep step takes. */
  secondsPerRep?: number;
}

/** Flatten blocks, rounds and sets into the linear list the player walks through. */
export function sequence(w: Workout, { getReady = 5, secondsPerRep = 3 }: SequenceOptions = {}): PlayStep[] {
  const out: Omit<PlayStep, 'est'>[] = [];
  const firstBlock = w.blocks.find((b) => b.steps.length)?.name ?? '';
  const single = { round: 1, rounds: 1, set: 1, sets: 1 };
  if (getReady > 0) out.push({ kind: 'prep', name: 'Get ready', duration: getReady, block: firstBlock, ...single });

  for (const b of w.blocks) {
    if (!b.steps.length) continue;
    const rounds = b.rounds ?? 1;
    for (let round = 1; round <= rounds; round++) {
      const ctx = { block: b.name, round, rounds };
      for (const st of b.steps) {
        if (st.kind === 'rest') {
          out.push({ kind: 'rest', name: 'Rest', duration: st.duration, ...ctx, set: 1, sets: 1 });
          continue;
        }
        const sets = st.kind === 'sets' ? st.sets : 1;
        const reps = st.kind === 'timed' ? undefined : st.reps;
        const duration = st.kind === 'reps' ? undefined : st.duration;
        for (let set = 1; set <= sets; set++) {
          out.push({
            kind: reps ? 'reps' : 'work',
            name: st.name,
            duration: reps ? null : (duration ?? 0),
            ...(reps && { reps }),
            ...(st.perSide && { perSide: true }),
            ...(st.cue && { cue: st.cue }),
            ...(st.video && { video: st.video }),
            ...ctx,
            set,
            sets,
          });
          if (set < sets && st.kind === 'sets' && st.rest) {
            out.push({ kind: 'rest', name: 'Rest', duration: st.rest, ...ctx, set, sets });
          }
        }
      }
      if (round < rounds && b.restBetweenRounds) {
        out.push({ kind: 'rest', name: 'Rest', duration: b.restBetweenRounds, ...ctx, set: 1, sets: 1 });
      }
    }
  }
  return out.map((x) => ({
    ...x,
    est: x.kind === 'reps' ? (x.reps ?? 0) * secondsPerRep * (x.perSide ? 2 : 1) : (x.duration ?? 0),
  }));
}

export interface WorkoutSummary {
  totalSeconds: number;
  /** Work and rep steps (not rests or the get-ready). */
  moves: number;
  blocks: number;
}

export function summarize(w: Workout, opts?: SequenceOptions): WorkoutSummary {
  const steps = sequence(w, { ...opts, getReady: opts?.getReady ?? 0 });
  return {
    totalSeconds: steps.reduce((a, s) => a + s.est, 0),
    moves: steps.filter((s) => s.kind === 'work' || s.kind === 'reps').length,
    blocks: w.blocks.length,
  };
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatMinutes(sec: number): string {
  return `${Math.max(1, Math.round(sec / 60))} min`;
}

/** The short spec shown beside a step: "× 8", "0:30", "3 × 8 / side". */
export function describeStep(st: Step): string {
  if (st.kind === 'rest') return formatClock(st.duration);
  const side = st.perSide ? ' / side' : '';
  if (st.kind === 'sets') return `${st.sets} × ${st.reps ?? formatClock(st.duration ?? 0)}${side}`;
  if (st.kind === 'reps') return `× ${st.reps}${side}`;
  return formatClock(st.duration) + side;
}

/** The spec for a player step. */
export function describePlayStep(x: PlayStep): string {
  const side = x.perSide ? ' / side' : '';
  return x.kind === 'reps' ? `× ${x.reps}${side}` : formatClock(x.duration ?? 0) + side;
}
