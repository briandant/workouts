import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../App.tsx';
import { workouts } from '../data/workouts.ts';

function Where() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

function renderAt(path: string, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <AppRoutes />
      <Where />
    </MemoryRouter>,
  );
}

const key = (k: string, code = k) => act(() => void fireEvent.keyDown(window, { key: k, code }));
const counter = () => screen.getByText(/^\d+ \/ \d+$/).textContent;

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] }));
afterEach(() => vi.useRealTimers());

describe('list', () => {
  it('shows every workout from /workouts', () => {
    renderAt('/');
    expect(workouts.length).toBeGreaterThanOrEqual(5);
    for (const w of workouts) expect(screen.getByText(w.title)).toBeInTheDocument();
  });
});

describe('detail', () => {
  it('shows blocks and steps and starts the player', () => {
    renderAt('/w/kettlebell-strength');
    expect(screen.getByRole('heading', { name: 'Main set' })).toBeInTheDocument();
    expect(screen.getByText('4 × 8')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /start workout/i }));
    expect(screen.getByTestId('path')).toHaveTextContent('/w/kettlebell-strength/play');
  });

  it('lists the equipment a workout needs', () => {
    renderAt('/w/kettlebell-strength');
    const needs = screen.getByRole('region', { name: /you.ll need/i });
    expect(needs).toHaveTextContent('Kettlebell');
  });

  it('says when a workout needs no equipment', () => {
    renderAt('/w/tabata');
    expect(screen.getByRole('region', { name: /you.ll need/i })).toHaveTextContent(/no equipment/i);
  });

  it('shows not found for an unknown workout', () => {
    renderAt('/w/nope');
    expect(screen.getByRole('heading', { name: 'Not found' })).toBeInTheDocument();
  });
});

describe('player keyboard', () => {
  it('pauses with space and moves with the arrow keys', () => {
    renderAt('/w/tabata/play', { fresh: true });
    expect(counter()).toBe('1 / 20');
    key(' ', 'Space');
    expect(screen.getByText('Paused')).toBeInTheDocument();
    key('ArrowRight');
    key('ArrowRight');
    expect(counter()).toBe('3 / 20');
    key('ArrowLeft');
    expect(counter()).toBe('2 / 20');
  });

  it('counts down in real time', () => {
    renderAt('/w/tabata/play', { fresh: true });
    expect(screen.getByRole('timer')).toHaveAccessibleName('0:05');
    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByRole('timer')).toHaveAccessibleName('0:03');
  });

  it('marks a rep step done with space', () => {
    renderAt('/w/bodyweight-rounds/play', { fresh: true });
    key('ArrowRight'); // past get ready
    key('ArrowRight'); // past arm circles → inchworm (reps)
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    key(' ', 'Space');
    expect(counter()).toBe('4 / ' + counter()!.split(' / ')[1]);
  });

  it('opens the shortcut list with ? and leaves with Escape', () => {
    renderAt('/w/tabata/play', { fresh: true });
    key('?');
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    key('Escape');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    key('Escape');
    expect(screen.getByTestId('path')).toHaveTextContent('/w/tabata');
  });

  it('resumes paused where you left off', () => {
    const first = renderAt('/w/tabata/play', { fresh: true });
    key('ArrowRight');
    key('ArrowRight');
    first.unmount();
    renderAt('/w/tabata/play');
    expect(counter()).toBe('3 / 20');
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });
});
