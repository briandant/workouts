import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { WorkoutService } from '@workouts/core';
import { FsWorkoutRepository } from '@workouts/core/node';
import { beforeEach, describe, expect, it } from 'vitest';
import { createServer } from './tools.ts';

let root: string;
let client: Client;

const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

async function call(name: string, args: Record<string, unknown> = {}) {
  const r = await client.callTool({ name, arguments: args });
  const body = (r.content as { type: string; text: string }[]).map((c) => c.text).join('\n');
  return { error: Boolean(r.isError), body };
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'workouts-mcp-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('commit', '-q', '--allow-empty', '-m', 'init');
  const server = createServer(new WorkoutService(new FsWorkoutRepository(root)), { root, push: false });
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'test', version: '1.0.0' });
  await Promise.all([server.connect(a), client.connect(b)]);
});

const core = {
  title: 'Core Burner',
  focus: 'Core',
  level: 'Beginner',
  summary: 'Short and spicy.',
  blocks: [{ name: 'Main', rounds: 2, steps: [{ kind: 'timed', name: 'Plank', duration: 30 }, { kind: 'rest', duration: 10 }] }],
};

describe('workouts MCP server', () => {
  it('lists its tools with typed input schemas', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['create_workout', 'add_steps', 'update_step', 'replace_step', 'publish']));
    const addSteps = tools.find((t) => t.name === 'add_steps')!;
    expect(JSON.stringify(addSteps.inputSchema)).toContain('"timed"');
  });

  it('creates a workout and returns an outline with ids', async () => {
    const r = await call('create_workout', core);
    expect(r.error).toBe(false);
    expect(r.body).toContain('Created workout "core-burner"');
    expect(r.body).toContain('[block main] Main · 2 rounds');
    expect(r.body).toContain('[plank] timed: Plank  0:30');
  });

  it('edits steps by id and previews the timing', async () => {
    await call('create_workout', core);
    await call('add_steps', { workoutId: 'core-burner', blockId: 'main', steps: [{ kind: 'reps', name: 'Crunch', reps: 15 }] });
    await call('update_step', { workoutId: 'core-burner', stepId: 'plank', changes: { duration: 45, cue: 'Hips level.' } });
    const r = await call('get_workout', { workoutId: 'core-burner' });
    expect(r.body).toContain('[plank] timed: Plank  0:45  (Hips level.)');
    expect(r.body).toContain('[crunch] reps: Crunch  × 15');
    const p = await call('preview_workout', { workoutId: 'core-burner' });
    expect(p.body).toMatch(/6 player steps, 4 moves/);
  });

  it('returns domain errors as tool errors Claude can act on', async () => {
    await call('create_workout', core);
    const wrongField = await call('update_step', { workoutId: 'core-burner', stepId: 'plank', changes: { reps: 10 } });
    expect(wrongField).toMatchObject({ error: true });
    expect(wrongField.body).toMatch(/timed step has no "reps".*replace_step/s);
    const unknown = await call('remove_step', { workoutId: 'core-burner', stepId: 'nope' });
    expect(unknown.body).toMatch(/No step "nope".*Steps: plank, rest/s);
  });

  it('rejects malformed input before it reaches the service', async () => {
    const r = await call('add_steps', { workoutId: 'x', blockId: 'main', steps: [{ kind: 'jumping', name: 'X' }] });
    expect(r.error).toBe(true);
  });

  it('rejects path-traversal ids', async () => {
    const r = await call('get_workout', { workoutId: '../package' });
    expect(r.error).toBe(true);
  });

  it('publishes only workouts/ and reports when there is nothing to publish', async () => {
    await call('create_workout', core);
    expect((await call('unpublished_changes')).body).toContain('workouts/core-burner.json');
    const r = await call('publish', { message: 'Add core burner' });
    expect(r.body).toMatch(/Committed 1 workout file\(s\) on main: workouts\/core-burner\.json/);
    expect(git('log', '-1', '--format=%s')).toBe('Add core burner');
    expect((await call('publish', { message: 'Again' })).body).toMatch(/Nothing to publish/);
  });

  it('refuses to publish when other files are staged', async () => {
    await call('create_workout', core);
    await writeFile(join(root, 'README.md'), 'hi');
    git('add', 'README.md');
    const r = await call('publish', { message: 'Add core burner' });
    expect(r).toMatchObject({ error: true });
    expect(r.body).toMatch(/Other files are staged \(README\.md\)/);
    expect(git('log', '-1', '--format=%s')).toBe('init');
  });
});
