import type { PlayStep } from '@workouts/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { beep, unlock } from './audio.ts';
import * as P from './player.ts';
import { loadSound, saveResume, saveSound } from './storage.ts';

const TICK_MS = 100;

/** Drives the player state machine with a clock, plays cues and remembers where you are. */
export function usePlayer(workoutId: string, steps: PlayStep[], start: () => P.PlayerState) {
  const [state, setState] = useState(start);
  const ref = useRef(state);
  const [sound, setSound] = useState(loadSound);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const commit = useCallback((next: P.PlayerState) => {
    if (next === ref.current) return;
    ref.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const { state: next, cues } = P.tick(ref.current, steps, now - last);
      last = now;
      commit(next);
      if (soundRef.current) for (const c of cues) beep(c === 'count' ? 660 : 990, c === 'count' ? 0.12 : 0.4);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [steps, commit]);

  // Remember the step (not every tick) so a reload resumes here.
  const { idx, finished, paused } = state;
  useEffect(() => {
    saveResume(finished ? null : { workoutId, idx, elapsedMs: Math.round(ref.current.elapsedMs) });
  }, [workoutId, idx, finished, paused]);

  const act = (fn: (s: P.PlayerState) => P.PlayerState) => {
    unlock();
    commit(fn(ref.current));
  };

  return {
    state,
    sound,
    toggleSound: () => {
      unlock();
      saveSound(!sound);
      setSound(!sound);
    },
    togglePause: () => act(P.togglePause),
    done: () => {
      if (soundRef.current) beep(990, 0.25);
      act((s) => P.done(s, steps));
    },
    next: () => act((s) => P.goTo(s, steps, s.idx + 1)),
    back: () => act((s) => P.goTo(s, steps, s.idx - 1)),
    addRest: () => act((s) => P.addRest(s, steps)),
    restart: () => act(() => P.initial(steps)),
  };
}
