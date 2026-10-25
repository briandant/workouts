import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Workout } from './model.ts';
import { assertWorkoutId, type WorkoutRepository } from './repository.ts';
import { parseWorkoutFile, toFileJson } from './serialize.ts';

/** Workouts as `<root>/workouts/<id>.json`. */
export class FsWorkoutRepository implements WorkoutRepository {
  readonly dir: string;

  constructor(root: string) {
    this.dir = join(root, 'workouts');
  }

  private file(id: string) {
    assertWorkoutId(id);
    return join(this.dir, `${id}.json`);
  }

  async list() {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }
    const files = names.filter((n) => n.endsWith('.json')).sort();
    return Promise.all(files.map(async (n) => parseWorkoutFile(await readFile(join(this.dir, n), 'utf8'), `workouts/${n}`)));
  }

  async get(id: string) {
    const file = this.file(id);
    try {
      return parseWorkoutFile(await readFile(file, 'utf8'), `workouts/${id}.json`);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw e;
    }
  }

  async put(workout: Workout) {
    const file = this.file(workout.id);
    await mkdir(this.dir, { recursive: true });
    // Write then rename so a crash never leaves a half-written workout.
    const tmp = `${file}.tmp`;
    await writeFile(tmp, toFileJson(workout));
    await rename(tmp, file);
  }

  async remove(id: string) {
    await rm(this.file(id), { force: true });
  }
}
