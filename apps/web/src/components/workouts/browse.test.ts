import { FOCUSES, type Tag, type Workout } from '@workouts/core';
import { describe, expect, it } from 'vitest';
import { workouts } from '../../data/workouts.ts';
import { groupByFocus, hasTag, matches, readTag, tagCounts } from './browse.ts';

const byId = (id: string) => workouts.find((w) => w.id === id)!;
const tagged = (id: string, ...tags: Tag[]): Workout => ({ ...byId(id), tags });

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

describe('tags', () => {
  it('search matches a workout’s tags', () => {
    expect(matches(tagged('tabata', 'Cervical'), 'cervical')).toBe(true);
    expect(matches(tagged('tabata'), 'cervical')).toBe(false);
  });

  it('counts the tags on a list of workouts in tag order, leaving out unused ones', () => {
    const ws = [tagged('tabata', 'HIIT'), tagged('kettlebell-strength', 'Prenatal', 'HIIT'), tagged('seven-minute')];
    expect(tagCounts(ws)).toEqual([
      { tag: 'HIIT', count: 2 },
      { tag: 'Prenatal', count: 1 },
    ]);
  });

  it('keeps every workout when no tag is chosen, else only the tagged ones', () => {
    expect(hasTag(tagged('tabata'), undefined)).toBe(true);
    expect(hasTag(tagged('tabata', 'HIIT'), 'HIIT')).toBe(true);
    expect(hasTag(tagged('tabata', 'Prenatal'), 'HIIT')).toBe(false);
  });

  it('reads a tag from the URL, ignoring anything that is not a tag', () => {
    expect(readTag('Low back')).toBe('Low back');
    expect(readTag('low back')).toBeUndefined();
    expect(readTag('Yoga')).toBeUndefined();
    expect(readTag(null)).toBeUndefined();
  });
});
