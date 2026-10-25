/* Beeps via WebAudio. Call unlock() from a click so browsers allow sound. */

let ctx: AudioContext | null = null;

export function unlock(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function beep(freq: number, seconds: number): void {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const t = ctx.currentTime;
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + seconds + 0.02);
}
