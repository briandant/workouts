import { mkdtemp, readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { circuit, strength } from './fixtures.ts';
import { FsWorkoutRepository } from './fs-repository.ts';
import { toFileJson } from './serialize.ts';

let root: string;
let repo: FsWorkoutRepository;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'workouts-'));
  repo = new FsWorkoutRepository(root);
});

describe('FsWorkoutRepository', () => {
  it('puts, gets, lists and removes workouts as workouts/<id>.json', async () => {
    await repo.put(strength());
    await repo.put(circuit());
    expect(await readFile(join(root, 'workouts', 'kettlebell-strength.json'), 'utf8')).toBe(toFileJson(strength()));
    expect((await repo.get('bodyweight-rounds'))?.title).toBe('Bodyweight Rounds');
    expect((await repo.list()).map((w) => w.id)).toEqual(['bodyweight-rounds', 'kettlebell-strength']);
    await repo.remove('bodyweight-rounds');
    expect(await readdir(join(root, 'workouts'))).toEqual(['kettlebell-strength.json']);
  });

  it('returns undefined for a missing workout and lists nothing when the folder is absent', async () => {
    expect(await repo.get('nope')).toBeUndefined();
    expect(await repo.list()).toEqual([]);
  });

  it('rejects ids that could escape the workouts folder', async () => {
    await expect(repo.get('../package')).rejects.toThrow(/workout id/);
    await expect(repo.remove('a/b')).rejects.toThrow(/workout id/);
  });

  it('names the file when a stored workout is invalid', async () => {
    await mkdir(join(root, 'workouts'), { recursive: true });
    await writeFile(join(root, 'workouts', 'bad.json'), '{"id":"bad"}');
    await expect(repo.list()).rejects.toThrow(/bad\.json/);
  });
});
