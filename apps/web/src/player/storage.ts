/* Per-browser conveniences in localStorage. Every access is guarded: private
   windows and blocked storage just mean nothing is remembered. */

const RESUME = 'followalong.resume.v1';
const SOUND = 'followalong.sound.v1';

export interface Resume {
  workoutId: string;
  idx: number;
  elapsedMs: number;
}

function read<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export const loadResume = (workoutId: string): Resume | null => {
  const r = read<Resume>(RESUME);
  return r && r.workoutId === workoutId && r.idx > 0 ? r : null;
};
export const saveResume = (r: Resume | null) => write(RESUME, r);
export const loadSound = () => read<boolean>(SOUND) ?? true;
export const saveSound = (on: boolean) => write(SOUND, on);
