/*
  One-off: convert the Claude Design prototype's workouts.js into workouts/*.json,
  going through WorkoutService so ids and file format match everything else.
  Usage: npm run migrate-prototype
*/
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { WorkoutService, type StepInput } from '../src/index.ts';
import { FsWorkoutRepository } from '../src/node.ts';

type ProtoStep = {
  name?: string;
  duration?: number;
  reps?: number;
  sets?: number;
  rest?: number;
  cue?: string;
  perSide?: boolean;
  video?: string;
};
type ProtoWorkout = {
  id: string;
  title: string;
  focus: string;
  level: string;
  summary: string;
  blocks: { name: string; rounds?: number; restBetweenRounds?: number; steps: ProtoStep[] }[];
};

const root = resolve(fileURLToPath(import.meta.url), '../../../..');
const source = resolve(root, 'docs/design/workouts.js');

function toStep(s: ProtoStep): StepInput {
  const extras = { ...(s.cue && { cue: s.cue }), ...(s.perSide && { perSide: true }), ...(s.video && { video: s.video }) };
  if (!s.name) return { kind: 'rest', duration: s.rest! };
  if (s.sets) {
    return {
      kind: 'sets',
      name: s.name,
      sets: s.sets,
      ...(s.reps ? { reps: s.reps } : { duration: s.duration! }),
      ...(s.rest && { rest: s.rest }),
      ...extras,
    };
  }
  if (s.reps) return { kind: 'reps', name: s.name, reps: s.reps, ...extras };
  return { kind: 'timed', name: s.name, duration: s.duration!, ...extras };
}

const { default: workouts } = (await import(pathToFileURL(source).href)) as { default: ProtoWorkout[] };
const svc = new WorkoutService(new FsWorkoutRepository(root));

for (const w of workouts) {
  const { message } = await svc.createWorkout({
    id: w.id,
    title: w.title,
    focus: w.focus as never,
    level: w.level as never,
    summary: w.summary,
    blocks: w.blocks.map((b) => ({
      name: b.name,
      ...(b.rounds && b.rounds > 1 && { rounds: b.rounds }),
      ...(b.restBetweenRounds && { restBetweenRounds: b.restBetweenRounds }),
      steps: b.steps.map(toStep),
    })),
  });
  console.log(message);
}
