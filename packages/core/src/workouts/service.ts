import { z } from 'zod';
import { describeIssues, WorkoutError } from './errors.ts';
import { slugify, uniqueId } from './ids.ts';
import {
  Block,
  BlockInput,
  Id,
  StepInput,
  Workout,
  WorkoutMeta,
  Step,
  type StepKind,
} from './model.ts';
import type { WorkoutRepository } from './repository.ts';

/** Where to put an inserted or moved item. Default: the end. */
export const Position = z.strictObject({
  afterId: Id.optional().describe('Insert after the item with this id'),
  atStart: z.boolean().optional().describe('Insert at the start instead of the end'),
});
export type Position = z.infer<typeof Position>;

export const CreateWorkoutInput = WorkoutMeta.extend({
  id: Id.optional().describe('Defaults to a slug of the title'),
  blocks: z.array(BlockInput).optional(),
}).strict();
export type CreateWorkoutInput = z.infer<typeof CreateWorkoutInput>;

export const WorkoutMetaPatch = WorkoutMeta.partial().strict();
export type WorkoutMetaPatch = z.infer<typeof WorkoutMetaPatch>;

export const DuplicateInput = z.strictObject({ title: WorkoutMeta.shape.title, id: Id.optional() });
export type DuplicateInput = z.infer<typeof DuplicateInput>;

export const BlockPatch = z.strictObject({
  name: Block.shape.name.optional(),
  rounds: Block.shape.rounds.nullable().describe('null removes rounds'),
  restBetweenRounds: Block.shape.restBetweenRounds.nullable().describe('null removes the rest'),
});
export type BlockPatch = z.infer<typeof BlockPatch>;

/** Fields of a step to change; null removes an optional field. Kind and id can't change here. */
export type StepPatch = Record<string, string | number | boolean | null>;

export const MoveStepInput = Position.extend({
  toBlockId: Id.optional().describe('Move into this block (default: the step’s current block)'),
}).strict();
export type MoveStepInput = z.infer<typeof MoveStepInput>;

export interface Change {
  workout: Workout;
  message: string;
  /** Ids created by the change, in order. */
  ids?: string[];
}

/** The fields updateStep may change on each kind of step: everything in its schema but id and kind. */
const STEP_FIELDS = Object.fromEntries(
  Step.options.map((s) => [s.shape.kind.value, Object.keys(s.shape).filter((k) => k !== 'id' && k !== 'kind')]),
) as Record<StepKind, string[]>;

function parse<S extends z.ZodType>(schema: S, value: unknown, label: string): z.infer<S> {
  const r = schema.safeParse(value);
  if (!r.success) throw new WorkoutError(`Invalid ${label}:\n${describeIssues(r.error)}`);
  return r.data;
}

function insertAt<T extends { id: string }>(list: T[], items: T[], pos: Position = {}, what: string): void {
  if (pos.atStart) list.unshift(...items);
  else if (pos.afterId) {
    const i = list.findIndex((x) => x.id === pos.afterId);
    if (i < 0) throw new WorkoutError(`No ${what} "${pos.afterId}" to insert after. ${what}s here: ${ids(list)}`);
    list.splice(i + 1, 0, ...items);
  } else list.push(...items);
}

const ids = (list: { id: string }[]) => list.map((x) => x.id).join(', ') || '(none)';
const allSteps = (w: Workout) => w.blocks.flatMap((b) => b.steps);

/**
 * All writes to workouts go through here. Each method loads the workout,
 * applies one typed change, validates the whole workout and saves it, so a
 * rejected change never reaches disk.
 */
export class WorkoutService {
  constructor(private readonly repo: WorkoutRepository) {}

  list(): Promise<Workout[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<Workout> {
    const w = await this.repo.get(id);
    if (!w) throw new WorkoutError(`No workout "${id}". Workouts: ${ids(await this.repo.list())}`);
    return w;
  }

  private async save(workout: Workout, message: string, created?: string[]): Promise<Change> {
    const valid = parse(Workout, workout, `workout "${workout.id}"`);
    await this.repo.put(valid);
    return { workout: valid, message, ...(created && { ids: created }) };
  }

  private async change(id: string, fn: (w: Workout) => { message: string; ids?: string[] }): Promise<Change> {
    const w = await this.get(id);
    const { message, ids: created } = fn(w);
    return this.save(w, message, created);
  }

  private async assertFreeId(id: string): Promise<void> {
    if (await this.repo.get(id)) throw new WorkoutError(`A workout "${id}" already exists. Pick another title or id.`);
  }

  private makeSteps(w: Workout, inputs: StepInput[]): Step[] {
    const taken = new Set(allSteps(w).map((s) => s.id));
    return inputs.map((s) => {
      const id = uniqueId(s.kind === 'rest' ? 'rest' : slugify(s.name), taken);
      taken.add(id);
      return { id, ...s } as Step;
    });
  }

  private makeBlock(w: Workout, input: BlockInput): Block {
    const { steps = [], ...rest } = input;
    const block: Block = { id: uniqueId(slugify(input.name), w.blocks.map((b) => b.id)), ...rest, steps: [] };
    block.steps = this.makeSteps(w, steps);
    return block;
  }

  private block(w: Workout, blockId: string): Block {
    const b = w.blocks.find((x) => x.id === blockId);
    if (!b) throw new WorkoutError(`No block "${blockId}" in workout "${w.id}". Blocks: ${ids(w.blocks)}`);
    return b;
  }

  private step(w: Workout, stepId: string): { block: Block; index: number; step: Step } {
    for (const block of w.blocks) {
      const index = block.steps.findIndex((s) => s.id === stepId);
      if (index >= 0) return { block, index, step: block.steps[index]! };
    }
    throw new WorkoutError(`No step "${stepId}" in workout "${w.id}". Steps: ${ids(allSteps(w))}`);
  }

  /* Workouts */

  async createWorkout(input: CreateWorkoutInput): Promise<Change> {
    const { id, blocks = [], ...meta } = parse(CreateWorkoutInput, input, 'workout');
    const workout: Workout = { id: id ?? slugify(meta.title), ...meta, blocks: [] };
    await this.assertFreeId(workout.id);
    for (const b of blocks) workout.blocks.push(this.makeBlock(workout, b));
    const created = [workout.id, ...workout.blocks.flatMap((b) => [b.id, ...b.steps.map((s) => s.id)])];
    return this.save(workout, `Created workout "${workout.id}"`, created);
  }

  updateWorkoutMeta(id: string, patch: WorkoutMetaPatch): Promise<Change> {
    const p = parse(WorkoutMetaPatch, patch, 'workout details');
    return this.change(id, (w) => {
      Object.assign(w, p);
      return { message: `Updated ${Object.keys(p).join(', ') || 'nothing'} on "${id}"` };
    });
  }

  async duplicateWorkout(id: string, input: DuplicateInput): Promise<Change> {
    const p = parse(DuplicateInput, input, 'duplicate');
    const source = await this.get(id);
    const copy: Workout = { ...source, id: p.id ?? slugify(p.title), title: p.title };
    await this.assertFreeId(copy.id);
    return this.save(copy, `Duplicated "${id}" as "${copy.id}"`, [copy.id]);
  }

  async deleteWorkout(id: string): Promise<{ message: string }> {
    await this.get(id);
    await this.repo.remove(id);
    return { message: `Deleted workout "${id}"` };
  }

  /* Blocks */

  addBlock(workoutId: string, input: BlockInput, at?: Position): Promise<Change> {
    const b = parse(BlockInput, input, 'block');
    const pos = at && parse(Position, at, 'position');
    return this.change(workoutId, (w) => {
      const block = this.makeBlock(w, b);
      insertAt(w.blocks, [block], pos, 'block');
      return { message: `Added block "${block.id}"`, ids: [block.id, ...block.steps.map((s) => s.id)] };
    });
  }

  updateBlock(workoutId: string, blockId: string, patch: Partial<BlockPatch>): Promise<Change> {
    const p = parse(BlockPatch.partial(), patch, 'block changes');
    return this.change(workoutId, (w) => {
      const b = this.block(w, blockId) as Record<string, unknown>;
      for (const [k, v] of Object.entries(p)) {
        if (v === null) delete b[k];
        else if (v !== undefined) b[k] = v;
      }
      return { message: `Updated block "${blockId}"` };
    });
  }

  moveBlock(workoutId: string, blockId: string, to: Position): Promise<Change> {
    const pos = parse(Position, to, 'position');
    if (pos.afterId === blockId) throw new WorkoutError('A block can’t be moved after itself.');
    return this.change(workoutId, (w) => {
      const b = this.block(w, blockId);
      w.blocks.splice(w.blocks.indexOf(b), 1);
      insertAt(w.blocks, [b], pos, 'block');
      return { message: `Moved block "${blockId}"` };
    });
  }

  removeBlock(workoutId: string, blockId: string): Promise<Change> {
    return this.change(workoutId, (w) => {
      w.blocks.splice(w.blocks.indexOf(this.block(w, blockId)), 1);
      return { message: `Removed block "${blockId}"` };
    });
  }

  /* Steps */

  addSteps(workoutId: string, blockId: string, inputs: StepInput[], at?: Position): Promise<Change> {
    const steps = parse(z.array(StepInput).min(1), inputs, 'steps');
    const pos = at && parse(Position, at, 'position');
    return this.change(workoutId, (w) => {
      const made = this.makeSteps(w, steps);
      insertAt(this.block(w, blockId).steps, made, pos, 'step');
      return { message: `Added ${made.length} step(s) to "${blockId}"`, ids: made.map((s) => s.id) };
    });
  }

  updateStep(workoutId: string, stepId: string, patch: StepPatch): Promise<Change> {
    return this.change(workoutId, (w) => {
      const { step } = this.step(w, stepId);
      const fields = STEP_FIELDS[step.kind];
      for (const k of Object.keys(patch)) {
        if (k === 'id' || k === 'kind' || !fields.includes(k)) {
          throw new WorkoutError(
            `A ${step.kind} step has no "${k}" field you can update (its fields: ${fields.join(', ')}). ` +
              'To make it a different kind of step, use replace_step.',
          );
        }
      }
      const s = step as Record<string, unknown>;
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) delete s[k];
        else s[k] = v;
      }
      return { message: `Updated step "${stepId}"` };
    });
  }

  replaceStep(workoutId: string, stepId: string, input: StepInput): Promise<Change> {
    const next = parse(StepInput, input, 'step');
    return this.change(workoutId, (w) => {
      const { block, index } = this.step(w, stepId);
      block.steps[index] = { id: stepId, ...next } as Step;
      return { message: `Replaced step "${stepId}" with a ${next.kind} step` };
    });
  }

  moveStep(workoutId: string, stepId: string, to: MoveStepInput): Promise<Change> {
    const { toBlockId, ...pos } = parse(MoveStepInput, to, 'move');
    if (pos.afterId === stepId) throw new WorkoutError('A step can’t be moved after itself.');
    return this.change(workoutId, (w) => {
      const { block, index, step } = this.step(w, stepId);
      const target = toBlockId ? this.block(w, toBlockId) : block;
      block.steps.splice(index, 1);
      insertAt(target.steps, [step], pos, 'step');
      return { message: `Moved step "${stepId}"${toBlockId ? ` to block "${toBlockId}"` : ''}` };
    });
  }

  removeStep(workoutId: string, stepId: string): Promise<Change> {
    return this.change(workoutId, (w) => {
      const { block, index } = this.step(w, stepId);
      block.steps.splice(index, 1);
      return { message: `Removed step "${stepId}"` };
    });
  }
}
