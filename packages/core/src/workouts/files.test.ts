import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseWorkoutFile, toFileJson } from './serialize.ts';

const dir = resolve(import.meta.dirname, '../../../../workouts');

describe('workouts/*.json', () => {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

  it('has workouts', () => expect(files.length).toBeGreaterThan(0));

  it.each(files)('%s is valid, named by its id and in canonical format', async (f) => {
    const text = await readFile(join(dir, f), 'utf8');
    const w = parseWorkoutFile(text, `workouts/${f}`);
    expect(`${w.id}.json`).toBe(f);
    expect(toFileJson(w)).toBe(text);
  });

  it.each(files)('%s lists the equipment it needs ([] for none)', async (f) => {
    const w = parseWorkoutFile(await readFile(join(dir, f), 'utf8'), `workouts/${f}`);
    expect(w.equipment).toBeInstanceOf(Array);
  });
});
