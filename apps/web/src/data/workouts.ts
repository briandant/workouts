import { parseWorkout, type Workout } from '@workouts/core';

/* Workouts are bundled at build time from /workouts/*.json (edited via the MCP server). */
const files = import.meta.glob('../../../../workouts/*.json', { eager: true, import: 'default' });

export const workouts: Workout[] = Object.entries(files)
  .map(([path, data]) => parseWorkout(data, path.replace(/^.*\/workouts\//, 'workouts/')))
  .sort((a, b) => a.title.localeCompare(b.title));

export const findWorkout = (id: string | undefined) => workouts.find((w) => w.id === id);
