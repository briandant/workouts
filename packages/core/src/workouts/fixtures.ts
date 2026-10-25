import type { Workout } from './model.ts';

/** Test data. Not shipped. */
export const strength = (): Workout => ({
  id: 'kettlebell-strength',
  title: 'Kettlebell Strength',
  focus: 'Strength',
  level: 'Intermediate',
  summary: 'Heavy sets with full recovery between them.',
  blocks: [
    {
      id: 'warm-up',
      name: 'Warm-up',
      steps: [
        { id: 'kettlebell-halo', kind: 'reps', name: 'Kettlebell halo', reps: 8, cue: 'Each direction.' },
        { id: 'goblet-squat-hold', kind: 'timed', name: 'Goblet squat hold', duration: 30 },
      ],
    },
    {
      id: 'main-set',
      name: 'Main set',
      steps: [
        { id: 'goblet-squat', kind: 'sets', name: 'Goblet squat', sets: 3, reps: 8, rest: 90 },
        { id: 'single-arm-row', kind: 'sets', name: 'Single-arm row', sets: 2, reps: 10, perSide: true },
      ],
    },
  ],
});

export const circuit = (): Workout => ({
  id: 'bodyweight-rounds',
  title: 'Bodyweight Rounds',
  focus: 'Circuit',
  level: 'Beginner',
  summary: 'Rounds of push-ups and a plank.',
  blocks: [
    {
      id: 'circuit',
      name: 'Circuit',
      rounds: 2,
      restBetweenRounds: 60,
      steps: [
        { id: 'push-up', kind: 'reps', name: 'Push-up', reps: 10 },
        { id: 'rest', kind: 'rest', duration: 15 },
        { id: 'plank', kind: 'timed', name: 'Plank', duration: 30 },
      ],
    },
  ],
});
