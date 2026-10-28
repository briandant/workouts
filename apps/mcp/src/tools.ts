import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  BlockInput,
  BlockPatch,
  Id,
  Position,
  Seconds,
  StepInput,
  WorkoutError,
  WorkoutMeta,
  WorkoutService,
  type Change,
  type StepPatch,
} from '@workouts/core';
import { z } from 'zod';
import { publishWorkouts, workoutChanges } from './git.ts';
import { outline, preview } from './outline.ts';

const INSTRUCTIONS = `Workouts for the Follow-along app. Each workout is a JSON file in the repo's workouts/ folder; the app is rebuilt and deployed to GitHub Pages when they are pushed to main.

Never write workout JSON yourself: change workouts only with these tools. They validate every change and keep ids and the file format stable.

A workout has a title, focus, level, summary and optional equipment (the items needed, e.g. "Pull-up bar", "Resistance band (optional)"; [] means none).

How a workout is built: blocks (e.g. Warm-up, Main set, Cool-down; a block can repeat for several rounds, with restBetweenRounds seconds between them) hold steps. Step kinds:
- timed: do it for duration seconds
- reps: do reps reps, then tap Done
- sets: several sets of reps OR duration, with optional rest seconds between sets
- rest: rest for duration seconds
Named steps may have a cue (short form note), perSide, and a video (YouTube or .mp4 URL).

Blocks and steps are addressed by id (shown in [brackets] by get_workout). Work in this order: get_workout or list_workouts, make the edits, check timing with preview_workout, then call publish once with a short commit message describing the change.`;

const WorkoutId = Id.describe('Workout id, e.g. "tabata"');
const BlockId = Id.describe('Block id from get_workout');
const StepId = Id.describe('Step id from get_workout');

const nullable = <T extends z.ZodType>(t: T) => t.nullable().optional();
const StepPatchSchema = z
  .strictObject({
    name: z.string().optional(),
    duration: Seconds.optional(),
    reps: z.number().int().positive().optional(),
    sets: z.number().int().positive().optional(),
    rest: nullable(Seconds).describe('Rest between sets; null removes it'),
    cue: nullable(z.string()).describe('null removes it'),
    perSide: nullable(z.boolean()).describe('null removes it'),
    video: nullable(z.string()).describe('null removes it'),
  })
  .describe('Only the fields to change. Fields must belong to the step’s kind; use replace_step to change kind.');

const text = (t: string): CallToolResult => ({ content: [{ type: 'text', text: t }] });

function changed(c: Change): CallToolResult {
  const ids = c.ids?.length ? `\nNew ids: ${c.ids.join(', ')}` : '';
  return text(`${c.message}.${ids}\n\n${outline(c.workout)}\n\nRemember to publish when you're done editing.`);
}

/** Turn domain errors into tool errors Claude can read and correct; let anything else surface as a bug. */
async function run(fn: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof WorkoutError) return { isError: true, content: [{ type: 'text', text: e.message }] };
    throw e;
  }
}

export interface ServerOptions {
  /** Repo root, for git. */
  root: string;
  /** Set false in tests to commit without pushing. */
  push?: boolean;
}

export function createServer(svc: WorkoutService, { root, push = true }: ServerOptions): McpServer {
  const server = new McpServer({ name: 'workouts', version: '1.0.0' }, { instructions: INSTRUCTIONS });
  const read = { readOnlyHint: true, openWorldHint: false };
  const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

  /* Reading */

  server.registerTool(
    'list_workouts',
    { title: 'List workouts', description: 'Every workout with its id, focus, level and length.', annotations: read },
    () =>
      run(async () => {
        const all = await svc.list();
        return text(all.map((w) => outline(w).split('\n')[0]).join('\n') || 'No workouts yet.');
      }),
  );

  server.registerTool(
    'get_workout',
    {
      title: 'Get workout',
      description: 'A workout’s blocks and steps with their ids. Use the ids for every edit.',
      inputSchema: { workoutId: WorkoutId },
      annotations: read,
    },
    ({ workoutId }) => run(async () => text(outline(await svc.get(workoutId)))),
  );

  server.registerTool(
    'preview_workout',
    {
      title: 'Preview workout',
      description: 'The order the player runs a workout in, with running time and total length. Use it to check timing.',
      inputSchema: { workoutId: WorkoutId },
      annotations: read,
    },
    ({ workoutId }) => run(async () => text(preview(await svc.get(workoutId)))),
  );

  server.registerTool(
    'unpublished_changes',
    { title: 'Unpublished changes', description: 'Workout files changed since the last publish.', annotations: read },
    () =>
      run(async () => {
        const c = await workoutChanges(root);
        return text(c.length ? c.join('\n') : 'Everything is published.');
      }),
  );

  /* Workouts */

  server.registerTool(
    'create_workout',
    {
      title: 'Create workout',
      description: 'Create a workout. You can pass all its blocks and steps at once, or add them afterwards.',
      inputSchema: {
        ...WorkoutMeta.shape,
        id: Id.optional().describe('Defaults to a slug of the title'),
        blocks: z.array(BlockInput).optional(),
      },
      annotations: write,
    },
    (input) => run(async () => changed(await svc.createWorkout(input))),
  );

  server.registerTool(
    'update_workout_details',
    {
      title: 'Update workout details',
      description: 'Change a workout’s title, focus, level, summary or equipment.',
      inputSchema: { workoutId: WorkoutId, ...WorkoutMeta.partial().shape },
      annotations: write,
    },
    ({ workoutId, ...patch }) => run(async () => changed(await svc.updateWorkoutMeta(workoutId, patch))),
  );

  server.registerTool(
    'duplicate_workout',
    {
      title: 'Duplicate workout',
      description: 'Copy a workout under a new title, to make a variation.',
      inputSchema: { workoutId: WorkoutId, title: WorkoutMeta.shape.title, newId: Id.optional() },
      annotations: write,
    },
    ({ workoutId, title, newId }) =>
      run(async () => changed(await svc.duplicateWorkout(workoutId, { title, ...(newId && { id: newId }) }))),
  );

  server.registerTool(
    'delete_workout',
    {
      title: 'Delete workout',
      description: 'Delete a workout. It stays in git history.',
      inputSchema: { workoutId: WorkoutId },
      annotations: { ...write, destructiveHint: true },
    },
    ({ workoutId }) => run(async () => text((await svc.deleteWorkout(workoutId)).message)),
  );

  /* Blocks */

  server.registerTool(
    'add_block',
    {
      title: 'Add block',
      description: 'Add a block (optionally with steps) to a workout. Goes at the end unless afterId or atStart is given.',
      inputSchema: { workoutId: WorkoutId, block: BlockInput, ...Position.shape },
      annotations: write,
    },
    ({ workoutId, block, ...at }) => run(async () => changed(await svc.addBlock(workoutId, block, at))),
  );

  server.registerTool(
    'update_block',
    {
      title: 'Update block',
      description: 'Rename a block or set its rounds and rest between rounds (null removes them).',
      inputSchema: { workoutId: WorkoutId, blockId: BlockId, ...BlockPatch.partial().shape },
      annotations: write,
    },
    ({ workoutId, blockId, ...patch }) => run(async () => changed(await svc.updateBlock(workoutId, blockId, patch))),
  );

  server.registerTool(
    'move_block',
    {
      title: 'Move block',
      description: 'Move a block after another block, or to the start.',
      inputSchema: { workoutId: WorkoutId, blockId: BlockId, ...Position.shape },
      annotations: write,
    },
    ({ workoutId, blockId, ...to }) => run(async () => changed(await svc.moveBlock(workoutId, blockId, to))),
  );

  server.registerTool(
    'remove_block',
    {
      title: 'Remove block',
      description: 'Remove a block and all its steps.',
      inputSchema: { workoutId: WorkoutId, blockId: BlockId },
      annotations: { ...write, destructiveHint: true },
    },
    ({ workoutId, blockId }) => run(async () => changed(await svc.removeBlock(workoutId, blockId))),
  );

  /* Steps */

  server.registerTool(
    'add_steps',
    {
      title: 'Add steps',
      description: 'Add one or more steps to a block, in order. They go at the end unless afterId (a step id) or atStart is given.',
      inputSchema: { workoutId: WorkoutId, blockId: BlockId, steps: z.array(StepInput).min(1), ...Position.shape },
      annotations: write,
    },
    ({ workoutId, blockId, steps, ...at }) => run(async () => changed(await svc.addSteps(workoutId, blockId, steps, at))),
  );

  server.registerTool(
    'update_step',
    {
      title: 'Update step',
      description: 'Change some fields of a step (e.g. reps, duration, cue) keeping its kind. null removes an optional field.',
      inputSchema: { workoutId: WorkoutId, stepId: StepId, changes: StepPatchSchema },
      annotations: write,
    },
    ({ workoutId, stepId, changes }) =>
      run(async () => changed(await svc.updateStep(workoutId, stepId, changes as StepPatch))),
  );

  server.registerTool(
    'replace_step',
    {
      title: 'Replace step',
      description: 'Replace a step with a new one, e.g. to change its kind (timed → sets). Keeps its id and position.',
      inputSchema: { workoutId: WorkoutId, stepId: StepId, step: StepInput },
      annotations: write,
    },
    ({ workoutId, stepId, step }) => run(async () => changed(await svc.replaceStep(workoutId, stepId, step))),
  );

  server.registerTool(
    'move_step',
    {
      title: 'Move step',
      description: 'Move a step after another step, to the start of a block, or into another block (toBlockId).',
      inputSchema: { workoutId: WorkoutId, stepId: StepId, toBlockId: BlockId.optional(), ...Position.shape },
      annotations: write,
    },
    ({ workoutId, stepId, ...to }) => run(async () => changed(await svc.moveStep(workoutId, stepId, to))),
  );

  server.registerTool(
    'remove_step',
    {
      title: 'Remove step',
      description: 'Remove a step.',
      inputSchema: { workoutId: WorkoutId, stepId: StepId },
      annotations: { ...write, destructiveHint: true },
    },
    ({ workoutId, stepId }) => run(async () => changed(await svc.removeStep(workoutId, stepId))),
  );

  /* Shipping */

  server.registerTool(
    'publish',
    {
      title: 'Publish workouts',
      description:
        'Commit all workout changes and push, which redeploys the app. Call once after a batch of edits. Only commits files in workouts/.',
      inputSchema: { message: z.string().trim().min(3).max(120).describe('Commit message, e.g. "Add 20-minute core workout"') },
      annotations: { ...write, openWorldHint: true },
    },
    ({ message }) => run(async () => text(await publishWorkouts(root, message, { push }))),
  );

  return server;
}
