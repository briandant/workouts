import { describe, expect, it } from 'vitest';
import { circuit, strength } from './fixtures.ts';
import { describeStep, formatClock, sequence, summarize } from './sequence.ts';

describe('sequence', () => {
  it('starts with a get-ready step unless disabled', () => {
    expect(sequence(circuit())[0]).toMatchObject({ kind: 'prep', duration: 5 });
    expect(sequence(circuit(), { getReady: 0 })[0]).toMatchObject({ kind: 'reps', name: 'Push-up' });
  });

  it('repeats rounds with rest between rounds but not after the last', () => {
    const steps = sequence(circuit(), { getReady: 0 });
    expect(steps.map((s) => `${s.kind}:${s.name}:${s.round}`)).toEqual([
      'reps:Push-up:1',
      'rest:Rest:1',
      'work:Plank:1',
      'rest:Rest:1',
      'reps:Push-up:2',
      'rest:Rest:2',
      'work:Plank:2',
    ]);
    expect(steps[3]).toMatchObject({ duration: 60 });
  });

  it('expands sets with rest between them but not after the last set', () => {
    const steps = sequence(strength(), { getReady: 0 }).filter((s) => s.block === 'Main set');
    expect(steps.map((s) => `${s.kind}:${s.name}:${s.set}/${s.sets}`)).toEqual([
      'reps:Goblet squat:1/3',
      'rest:Rest:1/3',
      'reps:Goblet squat:2/3',
      'rest:Rest:2/3',
      'reps:Goblet squat:3/3',
      'reps:Single-arm row:1/2',
      'reps:Single-arm row:2/2',
    ]);
  });

  it('estimates rep steps from seconds per rep, doubled per side', () => {
    const row = sequence(strength(), { getReady: 0, secondsPerRep: 3 }).find((s) => s.name === 'Single-arm row')!;
    expect(row.est).toBe(10 * 3 * 2);
  });

  it('skips empty blocks', () => {
    const w = circuit();
    w.blocks.push({ id: 'empty', name: 'Empty', steps: [] });
    expect(sequence(w, { getReady: 0 })).toHaveLength(7);
  });
});

describe('summarize', () => {
  it('totals duration and counts moves', () => {
    const s = summarize(circuit(), { getReady: 0, secondsPerRep: 3 });
    // 2 rounds × (30 reps-est + 15 rest + 30 plank) + 60 between rounds
    expect(s.totalSeconds).toBe(2 * (30 + 15 + 30) + 60);
    expect(s.moves).toBe(4);
    expect(s.blocks).toBe(1);
  });
});

describe('formatting', () => {
  it('formats a clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(-3)).toBe('0:00');
  });

  it('describes each step kind', () => {
    const [halo, hold] = strength().blocks[0]!.steps;
    const [squat, row] = strength().blocks[1]!.steps;
    expect(describeStep(halo!)).toBe('× 8');
    expect(describeStep(hold!)).toBe('0:30');
    expect(describeStep(squat!)).toBe('3 × 8');
    expect(describeStep(row!)).toBe('2 × 10 / side');
    expect(describeStep({ id: 'rest', kind: 'rest', duration: 90 })).toBe('1:30');
  });
});
