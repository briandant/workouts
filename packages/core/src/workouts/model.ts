import { z } from 'zod';

/*
  The workout model. Every workout file in /workouts is one `Workout`.
  Change workouts through WorkoutService (or the MCP tools that wrap it),
  never by hand-editing JSON: the service keeps ids stable and the file
  format canonical.
*/

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const Id = z.string().regex(SLUG, 'must be lowercase letters, digits and single hyphens, e.g. "push-up-2"');
export const Seconds = z.number().int().positive().max(3600).describe('seconds');
const Count = z.number().int().positive().max(500);

export const FOCUSES = ['HIIT', 'Strength', 'Circuit', 'Intervals', 'Mobility', 'Cardio', 'Core', 'Recovery'] as const;
export const LEVELS = ['All levels', 'Beginner', 'Intermediate', 'Advanced'] as const;
export const Focus = z.enum(FOCUSES);
export const Level = z.enum(LEVELS);

const Name = z.string().trim().min(1).max(80);
const Cue = z.string().trim().min(1).max(240).describe('Short form note shown under the step');
const PerSide = z.boolean().describe('Do the movement on each side');
const Video = z
  .url()
  .describe('Demo video: a YouTube link (watch, youtu.be, shorts; ?t= sets the start) or an .mp4/.webm URL');

const named = { name: Name, cue: Cue.optional(), perSide: PerSide.optional(), video: Video.optional() };

const timedShape = { kind: z.literal('timed'), ...named, duration: Seconds };
const repsShape = { kind: z.literal('reps'), ...named, reps: Count };
const setsShape = {
  kind: z.literal('sets'),
  ...named,
  sets: Count,
  reps: Count.optional(),
  duration: Seconds.optional(),
  rest: Seconds.optional().describe('Rest between sets, in seconds'),
};
const restShape = { kind: z.literal('rest'), duration: Seconds };

const oneTarget = (s: { reps?: number; duration?: number }) => (s.reps === undefined) !== (s.duration === undefined);
const oneTargetMsg = { message: 'a sets step needs exactly one of reps or duration' };

export const TimedStep = z.strictObject({ id: Id, ...timedShape });
export const RepsStep = z.strictObject({ id: Id, ...repsShape });
export const SetsStep = z.strictObject({ id: Id, ...setsShape }).refine(oneTarget, oneTargetMsg);
export const RestStep = z.strictObject({ id: Id, ...restShape });

export const Step = z.discriminatedUnion('kind', [TimedStep, RepsStep, SetsStep, RestStep]);

export const Block = z.strictObject({
  id: Id,
  name: Name,
  rounds: z.number().int().min(2).max(50).optional().describe('Repeat the block this many times'),
  restBetweenRounds: Seconds.optional(),
  steps: z.array(Step),
});

export const Workout = z.strictObject({
  id: Id,
  title: z.string().trim().min(1).max(60),
  focus: Focus,
  level: Level,
  summary: z.string().trim().min(1).max(200),
  blocks: z.array(Block),
});

export type Focus = z.infer<typeof Focus>;
export type Level = z.infer<typeof Level>;
export type TimedStep = z.infer<typeof TimedStep>;
export type RepsStep = z.infer<typeof RepsStep>;
export type SetsStep = z.infer<typeof SetsStep>;
export type RestStep = z.infer<typeof RestStep>;
export type Step = z.infer<typeof Step>;
export type StepKind = Step['kind'];
export type Block = z.infer<typeof Block>;
export type Workout = z.infer<typeof Workout>;

/* Inputs: the same shapes without ids. The service assigns ids. */

export const StepInput = z.discriminatedUnion('kind', [
  z.strictObject(timedShape),
  z.strictObject(repsShape),
  z.strictObject(setsShape).refine(oneTarget, oneTargetMsg),
  z.strictObject(restShape),
]);
export type StepInput = z.infer<typeof StepInput>;

export const BlockInput = z.strictObject({
  name: Name,
  rounds: Block.shape.rounds,
  restBetweenRounds: Block.shape.restBetweenRounds,
  steps: z.array(StepInput).optional(),
});
export type BlockInput = z.infer<typeof BlockInput>;

export const WorkoutMeta = Workout.pick({ title: true, focus: true, level: true, summary: true });
export type WorkoutMeta = z.infer<typeof WorkoutMeta>;
