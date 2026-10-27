import { describe, expect, it } from 'vitest';
import { circuit, strength } from './fixtures.ts';
import { parseWorkoutFile, toFileJson } from './serialize.ts';

describe('toFileJson', () => {
  it('writes keys in canonical order regardless of input order', () => {
    const w = strength();
    const shuffled = {
      blocks: w.blocks.map((b) => ({ steps: b.steps.map((s) => Object.fromEntries(Object.entries(s).reverse())), name: b.name, id: b.id })),
      summary: w.summary,
      level: w.level,
      focus: w.focus,
      title: w.title,
      id: w.id,
    };
    expect(toFileJson(shuffled as never)).toBe(toFileJson(w));
    const text = toFileJson(w);
    expect(text.indexOf('"id"')).toBeLessThan(text.indexOf('"title"'));
    expect(text).toContain('"id": "goblet-squat",\n          "kind": "sets",\n          "name": "Goblet squat"');
  });

  it('ends with a newline and uses two-space indent', () => {
    const text = toFileJson(circuit());
    expect(text.endsWith('}\n')).toBe(true);
    expect(text.split('\n')[1]).toBe('  "id": "bodyweight-rounds",');
  });

  it('writes equipment after the summary and before the blocks', () => {
    const text = toFileJson({ ...strength(), equipment: ['Kettlebell'] });
    expect(text).toContain('"summary": "Heavy sets with full recovery between them.",\n  "equipment": [\n    "Kettlebell"\n  ],\n  "blocks"');
  });

  it('is byte-stable through a parse and write', () => {
    const text = toFileJson(strength());
    expect(toFileJson(parseWorkoutFile(text))).toBe(text);
  });
});

describe('parseWorkoutFile', () => {
  it('rejects a field that does not belong to the step kind, naming the path', () => {
    const w = strength();
    (w.blocks[0]!.steps[1] as Record<string, unknown>).reps = 5;
    expect(() => parseWorkoutFile(JSON.stringify(w), 'kb.json')).toThrow(/kb\.json.*blocks\.0\.steps\.1/s);
  });

  it('rejects a sets step with both reps and duration', () => {
    const w = strength();
    (w.blocks[1]!.steps[0] as Record<string, unknown>).duration = 30;
    expect(() => parseWorkoutFile(JSON.stringify(w))).toThrow(/exactly one of reps or duration/);
  });

  it('rejects invalid JSON with a readable message', () => {
    expect(() => parseWorkoutFile('{ nope', 'x.json')).toThrow(/x\.json: not valid JSON/);
  });
});
