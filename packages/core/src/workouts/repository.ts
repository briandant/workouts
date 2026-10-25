import { WorkoutError } from './errors.ts';
import { SLUG, type Workout } from './model.ts';

export interface WorkoutRepository {
  list(): Promise<Workout[]>;
  get(id: string): Promise<Workout | undefined>;
  put(workout: Workout): Promise<void>;
  remove(id: string): Promise<void>;
}

export function assertWorkoutId(id: string): void {
  if (!SLUG.test(id)) throw new WorkoutError(`"${id}" is not a valid workout id (lowercase letters, digits, hyphens)`);
}

/** In-memory store for tests. Hands out copies so callers can't mutate stored state. */
export class MemoryWorkoutRepository implements WorkoutRepository {
  private items = new Map<string, Workout>();

  constructor(workouts: Workout[] = []) {
    for (const w of workouts) this.items.set(w.id, structuredClone(w));
  }

  async list() {
    return [...this.items.values()].sort((a, b) => a.id.localeCompare(b.id)).map((w) => structuredClone(w));
  }

  async get(id: string) {
    assertWorkoutId(id);
    const w = this.items.get(id);
    return w && structuredClone(w);
  }

  async put(workout: Workout) {
    assertWorkoutId(workout.id);
    this.items.set(workout.id, structuredClone(workout));
  }

  async remove(id: string) {
    assertWorkoutId(id);
    this.items.delete(id);
  }
}
