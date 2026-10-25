import { beforeEach, describe, expect, it } from 'vitest';
import { WorkoutError } from './errors.ts';
import { circuit, strength } from './fixtures.ts';
import { MemoryWorkoutRepository } from './repository.ts';
import { WorkoutService } from './service.ts';

let repo: MemoryWorkoutRepository;
let svc: WorkoutService;

beforeEach(() => {
  repo = new MemoryWorkoutRepository([strength(), circuit()]);
  svc = new WorkoutService(repo);
});

const stepIds = async (wid: string, bid: string) =>
  (await svc.get(wid)).blocks.find((b) => b.id === bid)!.steps.map((s) => s.id);

describe('workouts', () => {
  it('creates a workout with a slug id and assigns ids to nested blocks and steps', async () => {
    const { workout } = await svc.createWorkout({
      title: 'Core Burner',
      focus: 'Core',
      level: 'Beginner',
      summary: 'Short and spicy.',
      blocks: [
        {
          name: 'Main',
          steps: [
            { kind: 'timed', name: 'Plank', duration: 30 },
            { kind: 'rest', duration: 10 },
            { kind: 'timed', name: 'Plank', duration: 30 },
            { kind: 'rest', duration: 10 },
          ],
        },
      ],
    });
    expect(workout.id).toBe('core-burner');
    expect(workout.blocks[0]!.id).toBe('main');
    expect(workout.blocks[0]!.steps.map((s) => s.id)).toEqual(['plank', 'rest', 'plank-2', 'rest-2']);
    expect(await repo.get('core-burner')).toEqual(workout);
  });

  it('refuses to create a workout whose id is taken', async () => {
    await expect(
      svc.createWorkout({ title: 'Kettlebell Strength', focus: 'Strength', level: 'Advanced', summary: 'x' }),
    ).rejects.toThrow(/already exists/);
  });

  it('reports every invalid field with its path', async () => {
    const err = await svc
      .createWorkout({
        title: 'Bad',
        focus: 'Yoga' as never,
        level: 'Beginner',
        summary: 'x',
        blocks: [{ name: 'B', steps: [{ kind: 'timed', name: 'Plank', duration: -5 } as never] }],
      })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WorkoutError);
    expect((err as Error).message).toMatch(/focus/);
    expect((err as Error).message).toMatch(/blocks\.0\.steps\.0\.duration/);
  });

  it('updates metadata without touching blocks', async () => {
    const before = await svc.get('kettlebell-strength');
    const { workout } = await svc.updateWorkoutMeta('kettlebell-strength', { title: 'KB Strength', level: 'Advanced' });
    expect(workout.title).toBe('KB Strength');
    expect(workout.level).toBe('Advanced');
    expect(workout.blocks).toEqual(before.blocks);
  });

  it('duplicates a workout under a new id and title', async () => {
    const { workout } = await svc.duplicateWorkout('bodyweight-rounds', { title: 'Bodyweight Rounds II' });
    expect(workout.id).toBe('bodyweight-rounds-ii');
    expect(workout.blocks).toEqual(circuit().blocks);
  });

  it('deletes a workout and errors on an unknown one', async () => {
    await svc.deleteWorkout('bodyweight-rounds');
    expect(await repo.get('bodyweight-rounds')).toBeUndefined();
    await expect(svc.deleteWorkout('bodyweight-rounds')).rejects.toThrow(/No workout "bodyweight-rounds"/);
  });
});

describe('blocks', () => {
  it('adds a block after another, with steps', async () => {
    const { workout, ids } = await svc.addBlock(
      'kettlebell-strength',
      { name: 'Finisher', rounds: 3, steps: [{ kind: 'reps', name: 'Swing', reps: 20 }] },
      { afterId: 'warm-up' },
    );
    expect(workout.blocks.map((b) => b.id)).toEqual(['warm-up', 'finisher', 'main-set']);
    expect(ids).toEqual(['finisher', 'swing']);
  });

  it('adds a block at the start or the end', async () => {
    await svc.addBlock('kettlebell-strength', { name: 'Cool-down' });
    const { workout } = await svc.addBlock('kettlebell-strength', { name: 'Prep' }, { atStart: true });
    expect(workout.blocks.map((b) => b.id)).toEqual(['prep', 'warm-up', 'main-set', 'cool-down']);
  });

  it('updates a block and clears optional fields with null', async () => {
    const { workout } = await svc.updateBlock('bodyweight-rounds', 'circuit', { rounds: 4, restBetweenRounds: null });
    expect(workout.blocks[0]).toMatchObject({ rounds: 4 });
    expect(workout.blocks[0]).not.toHaveProperty('restBetweenRounds');
  });

  it('moves and removes blocks', async () => {
    await svc.moveBlock('kettlebell-strength', 'main-set', { atStart: true });
    expect((await svc.get('kettlebell-strength')).blocks.map((b) => b.id)).toEqual(['main-set', 'warm-up']);
    const { workout } = await svc.removeBlock('kettlebell-strength', 'warm-up');
    expect(workout.blocks.map((b) => b.id)).toEqual(['main-set']);
  });

  it('errors on an unknown block or position anchor', async () => {
    await expect(svc.updateBlock('kettlebell-strength', 'nope', { name: 'X' })).rejects.toThrow(
      /No block "nope" in workout "kettlebell-strength". Blocks: warm-up, main-set/,
    );
    await expect(svc.addBlock('kettlebell-strength', { name: 'X' }, { afterId: 'nope' })).rejects.toThrow(/nope/);
  });
});

describe('steps', () => {
  it('adds steps after a given step, with unique ids across the workout', async () => {
    const { ids } = await svc.addSteps(
      'kettlebell-strength',
      'main-set',
      [
        { kind: 'rest', duration: 60 },
        { kind: 'timed', name: 'Goblet squat hold', duration: 45 },
      ],
      { afterId: 'goblet-squat' },
    );
    expect(ids).toEqual(['rest', 'goblet-squat-hold-2']);
    expect(await stepIds('kettlebell-strength', 'main-set')).toEqual([
      'goblet-squat',
      'rest',
      'goblet-squat-hold-2',
      'single-arm-row',
    ]);
  });

  it('updates a step by id, leaving its id and kind alone', async () => {
    const { workout } = await svc.updateStep('bodyweight-rounds', 'push-up', { reps: 12, cue: 'Chest to floor.' });
    expect(workout.blocks[0]!.steps[0]).toEqual({
      id: 'push-up',
      kind: 'reps',
      name: 'Push-up',
      reps: 12,
      cue: 'Chest to floor.',
    });
  });

  it('clears an optional step field with null', async () => {
    const { workout } = await svc.updateStep('kettlebell-strength', 'kettlebell-halo', { cue: null });
    expect(workout.blocks[0]!.steps[0]).not.toHaveProperty('cue');
  });

  it('rejects a field that the step kind does not have and points to replace_step', async () => {
    await expect(svc.updateStep('bodyweight-rounds', 'plank', { reps: 10 })).rejects.toThrow(
      /timed step.*reps.*replace/is,
    );
    await expect(svc.updateStep('bodyweight-rounds', 'plank', { kind: 'reps' } as never)).rejects.toThrow(/replace/);
  });

  it('replaces a step with a different kind, keeping its id and position', async () => {
    const { workout } = await svc.replaceStep('bodyweight-rounds', 'plank', {
      kind: 'timed',
      name: 'Side plank',
      duration: 30,
      perSide: true,
    });
    expect(workout.blocks[0]!.steps[2]).toEqual({ id: 'plank', kind: 'timed', name: 'Side plank', duration: 30, perSide: true });
    const r = await svc.replaceStep('bodyweight-rounds', 'push-up', { kind: 'sets', name: 'Push-up', sets: 3, reps: 8 });
    expect(r.workout.blocks[0]!.steps[0]).toMatchObject({ id: 'push-up', kind: 'sets', sets: 3 });
  });

  it('moves a step within a block and into another block', async () => {
    await svc.moveStep('kettlebell-strength', 'single-arm-row', { atStart: true });
    expect(await stepIds('kettlebell-strength', 'main-set')).toEqual(['single-arm-row', 'goblet-squat']);
    await svc.moveStep('kettlebell-strength', 'goblet-squat', { toBlockId: 'warm-up', afterId: 'kettlebell-halo' });
    expect(await stepIds('kettlebell-strength', 'warm-up')).toEqual(['kettlebell-halo', 'goblet-squat', 'goblet-squat-hold']);
    expect(await stepIds('kettlebell-strength', 'main-set')).toEqual(['single-arm-row']);
  });

  it('removes a step and errors on unknown ids', async () => {
    const { workout } = await svc.removeStep('bodyweight-rounds', 'rest');
    expect(workout.blocks[0]!.steps.map((s) => s.id)).toEqual(['push-up', 'plank']);
    await expect(svc.removeStep('bodyweight-rounds', 'rest')).rejects.toThrow(/No step "rest"/);
  });

  it('leaves the stored workout untouched when a change is invalid', async () => {
    const before = await repo.get('bodyweight-rounds');
    await expect(svc.updateStep('bodyweight-rounds', 'push-up', { reps: 0 })).rejects.toThrow(WorkoutError);
    expect(await repo.get('bodyweight-rounds')).toEqual(before);
  });
});
