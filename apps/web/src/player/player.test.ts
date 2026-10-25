import type { PlayStep } from '@workouts/core';
import { describe, expect, it } from 'vitest';
import { addRest, goTo, initial, stepProgress, tick, timeLeft, togglePause } from './player.ts';

const base = { block: 'Main', round: 1, rounds: 1, set: 1, sets: 1 };
const steps: PlayStep[] = [
  { ...base, kind: 'prep', name: 'Get ready', duration: 5, est: 5 },
  { ...base, kind: 'work', name: 'Plank', duration: 30, est: 30 },
  { ...base, kind: 'rest', name: 'Rest', duration: 10, est: 10 },
  { ...base, kind: 'reps', name: 'Push-up', duration: null, reps: 10, est: 30 },
];

describe('player', () => {
  it('starts on the first step with its full duration', () => {
    expect(initial(steps)).toMatchObject({ idx: 0, remainingMs: 5000, paused: false, finished: false });
  });

  it('resumes paused at a saved step', () => {
    expect(initial(steps, { idx: 2, elapsedMs: 40_000, paused: true })).toMatchObject({
      idx: 2,
      remainingMs: 10_000,
      elapsedMs: 40_000,
      paused: true,
    });
  });

  it('counts down timed steps and beeps on the last three seconds', () => {
    let s = initial(steps);
    const cues: string[] = [];
    for (let i = 0; i < 45; i++) {
      const r = tick(s, steps, 100);
      s = r.state;
      cues.push(...r.cues);
    }
    expect(s.idx).toBe(0);
    expect(s.remainingMs).toBe(500);
    expect(cues).toEqual(['count', 'count', 'count']);
  });

  it('advances when a timed step runs out, with an end cue', () => {
    let s = goTo(initial(steps), steps, 2);
    s = { ...s, remainingMs: 50 };
    const r = tick(s, steps, 100);
    expect(r.cues).toContain('end');
    expect(r.state).toMatchObject({ idx: 3, stepElapsedMs: 0 });
  });

  it('does nothing while paused', () => {
    const s = togglePause(initial(steps));
    expect(tick(s, steps, 1000).state).toEqual(s);
  });

  it('waits on rep steps, timing how long they take', () => {
    const s = goTo(initial(steps), steps, 3);
    const r = tick(s, steps, 2500);
    expect(r.state).toMatchObject({ idx: 3, stepElapsedMs: 2500 });
    expect(r.cues).toEqual([]);
  });

  it('finishes after the last step and clamps going back past the start', () => {
    expect(goTo(initial(steps), steps, 4).finished).toBe(true);
    expect(goTo(initial(steps), steps, -1).idx).toBe(0);
  });

  it('adds rest time only during rests', () => {
    const rest = goTo(initial(steps), steps, 2);
    expect(addRest(rest, steps).remainingMs).toBe(20_000);
    const work = goTo(initial(steps), steps, 1);
    expect(addRest(work, steps)).toBe(work);
  });

  it('reports time left and step progress', () => {
    const s = { ...goTo(initial(steps), steps, 1), remainingMs: 15_000 };
    expect(timeLeft(s, steps)).toBe(15 + 10 + 30);
    expect(stepProgress(s, steps)).toBe(0.5);
  });
});
