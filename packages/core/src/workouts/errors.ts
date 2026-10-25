import type { z } from 'zod';

/** A change that can't be applied. The message is written for the person (or Claude) making it. */
export class WorkoutError extends Error {
  override name = 'WorkoutError';
}

export function describeIssues(error: z.ZodError, prefix = ''): string {
  return error.issues
    .map((i) => {
      const path = [prefix, ...i.path.map(String)].filter(Boolean).join('.');
      return path ? `${path}: ${i.message}` : i.message;
    })
    .join('\n');
}
