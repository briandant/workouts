import { FOCUSES } from '@workouts/core';
import { describe, expect, it } from 'vitest';
import { workouts } from '../../data/workouts.ts';
import { groupByFocus, matches } from './browse.ts';

const byId = (id: string) => workouts.find((w) => w.id === id)!;

describe('matches', () => {
  it('matches everything on an empty query', () => {
    expect(workouts.every((w) => matches(w, '  '))).toBe(true);
  });

  it('matches title, focus, equipment and move names, ignoring case', () => {
    const kb = byId('kettlebell-strength');
    expect(matches(kb, 'KETTLE')).toBe(true);
    expect(matches(kb, 'strength')).toBe(true);
    expect(matches(byId('tabata'), 'intervals')).toBe(true);
    expect(matches(kb, 'goblet squat')).toBe(true);
    expect(matches(byId('tabata'), 'goblet')).toBe(false);
  });

  it('needs every word to match', () => {
    const kb = byId('kettlebell-strength');
    expect(matches(kb, 'kettlebell strength')).toBe(true);
    expect(matches(kb, 'kettlebell yoga')).toBe(false);
  });
});

describe('groupByFocus', () => {
  it('groups in focus order, skipping empty focuses, keeping order within a group', () => {
    const groups = groupByFocus(workouts);
    expect(groups.flatMap((g) => g.workouts)).toHaveLength(workouts.length);
    expect(groups.every((g) => g.workouts.length > 0)).toBe(true);
    for (const g of groups) expect(g.workouts.every((w) => w.focus === g.focus)).toBe(true);
    const seen = groups.map((g) => FOCUSES.indexOf(g.focus));
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    const mobility = groups.find((g) => g.focus === 'Mobility')!.workouts.map((w) => w.title);
    expect(mobility).toEqual([...mobility].sort((a, b) => a.localeCompare(b)));
  });
});
