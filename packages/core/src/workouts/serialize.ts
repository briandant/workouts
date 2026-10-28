import { describeIssues, WorkoutError } from './errors.ts';
import { Workout, type Block, type Step } from './model.ts';

/** Canonical key order on disk; every model field must be listed or it is dropped on write. */
export const FILE_KEYS = {
  workout: ['id', 'title', 'focus', 'level', 'summary', 'equipment', 'blocks'],
  block: ['id', 'name', 'rounds', 'restBetweenRounds', 'steps'],
  step: ['id', 'kind', 'name', 'sets', 'reps', 'duration', 'rest', 'perSide', 'cue', 'video'],
} as const;

function ordered<T extends object>(obj: T, keys: readonly string[]): T {
  const src = obj as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (src[k] !== undefined) out[k] = src[k];
  return out as T;
}

/** The one way a workout is written to disk: canonical key order, 2-space indent, trailing newline. */
export function toFileJson(workout: Workout): string {
  const w = ordered(workout, FILE_KEYS.workout);
  w.blocks = workout.blocks.map((b): Block => {
    const block = ordered(b, FILE_KEYS.block);
    block.steps = b.steps.map((s): Step => ordered(s, FILE_KEYS.step));
    return block;
  });
  return JSON.stringify(w, null, 2) + '\n';
}

export function parseWorkout(data: unknown, source = ''): Workout {
  const result = Workout.safeParse(data);
  if (!result.success) {
    throw new WorkoutError(`${source ? source + ': ' : ''}invalid workout\n${describeIssues(result.error)}`);
  }
  return result.data;
}

export function parseWorkoutFile(text: string, source = ''): Workout {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new WorkoutError(`${source || 'workout'}: not valid JSON (${(e as Error).message})`);
  }
  return parseWorkout(data, source);
}
