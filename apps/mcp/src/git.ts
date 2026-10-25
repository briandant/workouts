import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { WorkoutError } from '@workouts/core';

const exec = promisify(execFile);

async function git(root: string, ...args: string[]): Promise<string> {
  try {
    const { stdout } = await exec('git', args, { cwd: root });
    return stdout.trim();
  } catch (e) {
    const err = e as { stderr?: string; message: string };
    throw new WorkoutError(`git ${args[0]} failed: ${(err.stderr || err.message).trim()}`);
  }
}

const lines = (s: string) => s.split('\n').filter(Boolean);

/** Uncommitted changes under workouts/, as `git status --short` lines. */
export async function workoutChanges(root: string): Promise<string[]> {
  return lines(await git(root, 'status', '--porcelain', '--untracked-files=all', '--', 'workouts/'));
}

/**
 * Commit everything under workouts/ and push the current branch. Refuses when
 * other files are staged, so a publish never sweeps up unrelated work.
 */
export async function publishWorkouts(root: string, message: string, { push = true } = {}): Promise<string> {
  const otherStaged = lines(await git(root, 'diff', '--cached', '--name-only')).filter((f) => !f.startsWith('workouts/'));
  if (otherStaged.length) {
    throw new WorkoutError(
      `Other files are staged (${otherStaged.join(', ')}). Commit or unstage them first; publish only commits workouts/.`,
    );
  }
  await git(root, 'add', '--all', '--', 'workouts/');
  const files = lines(await git(root, 'diff', '--cached', '--name-only', '--', 'workouts/'));
  if (!files.length) return 'Nothing to publish: workouts/ has no changes.';

  await git(root, 'commit', '-m', message, '--', 'workouts/');
  const branch = await git(root, 'rev-parse', '--abbrev-ref', 'HEAD');
  const committed = `Committed ${files.length} workout file(s) on ${branch}: ${files.join(', ')}.`;
  if (!push) return committed;

  try {
    await git(root, 'push', 'origin', 'HEAD');
  } catch (e) {
    throw new WorkoutError(`${committed} The push failed, so the commit is only local.\n${(e as Error).message}`);
  }
  return branch === 'main'
    ? `${committed} Pushed. GitHub Pages redeploys in a minute or two.`
    : `${committed} Pushed to ${branch}. Only pushes to main deploy, so merge it to publish.`;
}
