import { describePlayStep, formatClock, sequence, type PlayStep, type Workout } from '@workouts/core';
import { Check, Pause, Play, Plus, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BigClock } from '../components/ui/BigClock.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Icon } from '../components/ui/Icon.tsx';
import { Kicker } from '../components/ui/Kicker.tsx';
import { Segments } from '../components/ui/Segments.tsx';
import { Stat, StatGrid } from '../components/ui/Stat.tsx';
import { Tag } from '../components/ui/Tag.tsx';
import { findWorkout } from '../data/workouts.ts';
import { youtubeEmbed } from '../player/media.ts';
import * as P from '../player/player.ts';
import { loadResume, saveResume } from '../player/storage.ts';
import { usePlayer } from '../player/usePlayer.ts';
import { NotFound } from './NotFound.tsx';

const KIND_LABEL: Record<PlayStep['kind'], string> = { prep: 'Get ready', rest: 'Rest', work: 'Work', reps: 'Reps' };

export const SHORTCUTS: [string, string][] = [
  ['Space', 'Pause / resume (Done on rep steps)'],
  ['→', 'Next step'],
  ['←', 'Previous step'],
  ['R', 'Add 10 s to a rest'],
  ['M', 'Sound on / off'],
  ['Esc', 'Leave the workout'],
  ['?', 'Show these shortcuts'],
];

export function PlayerPage() {
  const { id } = useParams();
  const w = findWorkout(id);
  if (!w) return <NotFound />;
  return <Player key={w.id} workout={w} />;
}

function Player({ workout: w }: { workout: Workout }) {
  const navigate = useNavigate();
  const fresh = Boolean((useLocation().state as { fresh?: boolean } | null)?.fresh);
  const steps = useMemo(() => sequence(w), [w]);
  const p = usePlayer(w.id, steps, () => {
    const saved = fresh ? null : loadResume(w.id);
    if (fresh) saveResume(null);
    return saved && saved.idx < steps.length
      ? P.initial(steps, { idx: saved.idx, elapsedMs: saved.elapsedMs, paused: true })
      : P.initial(steps);
  });
  const { state: s } = p;
  const [help, setHelp] = useState(false);
  const exit = () => navigate(`/w/${w.id}`);

  const st = steps[s.idx]!;
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '?') return setHelp((h) => !h);
    if (help) return e.key === 'Escape' && setHelp(false);
    if (s.finished) return;
    if (e.code === 'Space') {
      e.preventDefault();
      return st.kind === 'reps' ? p.done() : p.togglePause();
    }
    if (e.key === 'ArrowRight') return p.next();
    if (e.key === 'ArrowLeft') return p.back();
    if (e.key === 'Escape') return exit();
    if (e.key === 'r' || e.key === 'R') return p.addRest();
    if (e.key === 'm' || e.key === 'M') return p.toggleSound();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  if (s.finished) {
    return <Finished workout={w} steps={steps} elapsedMs={s.elapsedMs} again={p.restart} />;
  }

  const rest = P.isRest(st);
  const timed = st.kind !== 'reps';
  const nextWork = rest ? steps.slice(s.idx + 1).find((x) => !P.isRest(x)) : st;
  const following = steps[s.idx + 1];
  const context = [
    st.block,
    st.rounds > 1 ? `Round ${st.round} of ${st.rounds}` : '',
    st.sets > 1 && !rest ? `Set ${st.set} of ${st.sets}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div data-tone={rest ? 'rest' : 'work'} className="flex min-h-dvh flex-col bg-bg transition-colors duration-300">
      <div className="flex items-center gap-2 px-3 pt-3 sm:px-5">
        <Button variant="ghost" size="icon" onClick={exit} aria-label="Leave workout">
          <Icon as={X} />
        </Button>
        <span className="min-w-0 flex-1 truncate font-display text-lg">{w.title}</span>
        <span className="text-sm text-muted tabular-nums">
          {s.idx + 1} / {steps.length}
        </span>
        <Button variant="ghost" size="icon" onClick={p.toggleSound} aria-label={p.sound ? 'Mute' : 'Unmute'} aria-pressed={!p.sound}>
          <Icon as={p.sound ? Volume2 : VolumeX} />
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 px-4 pt-1 sm:px-6">
        <Segments
          className="h-1.5"
          items={steps.map((x, i) => ({
            weight: x.est,
            fill: i < s.idx ? 1 : i > s.idx ? 0 : P.stepProgress(s, steps),
          }))}
        />
        <div className="flex justify-between text-xs text-muted tabular-nums">
          <span>{formatClock(s.elapsedMs / 1000)} elapsed</span>
          <span>~{formatClock(P.timeLeft(s, steps))} left</span>
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:gap-12">
        {nextWork?.video && <Demo step={nextWork} caption={rest ? `Up next: ${nextWork.name}` : nextWork.name} />}

        <section className={`flex min-w-0 flex-col gap-4 ${nextWork?.video ? '' : 'lg:col-span-2'}`}>
          <div className="flex flex-wrap items-center gap-3">
            <Tag>{KIND_LABEL[st.kind]}</Tag>
            <span className="text-sm text-muted">{context}</span>
          </div>
          <h1 className="font-display text-[clamp(2.75rem,9vw,5.5rem)] text-balance">
            {st.kind === 'prep' ? (nextWork?.name ?? 'Get ready') : st.name}
          </h1>

          {timed ? (
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
                <BigClock
                  text={formatClock(Math.ceil(s.remainingMs / 1000))}
                  dim={s.paused}
                  className="text-[clamp(8rem,34vw,17rem)] text-accent"
                />
                <div className="flex items-center gap-3 pb-3">
                  {rest && (
                    <Button onClick={p.addRest} className="rounded-full">
                      <Icon as={Plus} size={16} />
                      10s
                    </Button>
                  )}
                  {s.paused && <span className="text-sm font-bold tracking-[0.2em] text-muted uppercase">Paused</span>}
                </div>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-ink/12">
                <div className="h-full bg-accent" style={{ width: `${(P.stepProgress(s, steps) * 100).toFixed(2)}%` }} />
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-end gap-4">
              <span className="font-display text-[clamp(8rem,34vw,17rem)] leading-[0.8] text-accent tabular-nums">{st.reps}</span>
              <span className="flex flex-col gap-1 pb-3">
                <span className="font-display text-3xl">{st.perSide ? 'reps / side' : 'reps'}</span>
                <span className="text-sm text-muted tabular-nums">{formatClock(s.stepElapsedMs / 1000)} on this step</span>
              </span>
            </div>
          )}

          {!rest && st.cue && <p className="max-w-[46ch] text-lg text-ink/85">{st.cue}</p>}

          <div className="mt-2 flex items-center gap-4 rounded-card border border-line bg-surface/60 px-4 py-3">
            <span className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase">Next</span>
            <span className="min-w-0 flex-1 truncate font-display text-2xl">
              {following ? (following.kind === 'rest' ? 'Rest' : following.name) : 'Finish'}
            </span>
            <span className="font-display text-xl tabular-nums">{following ? describePlayStep(following) : ''}</span>
          </div>
        </section>
      </main>

      <nav
        aria-label="Player controls"
        className="sticky bottom-0 flex flex-wrap items-center justify-center gap-3 border-t border-line bg-bg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] transition-colors duration-300"
      >
        <Button size="icon-lg" onClick={p.back} aria-label="Previous step">
          <Icon as={SkipBack} size={22} />
        </Button>
        {timed ? (
          <Button variant="primary" size="lg" className="min-w-44" onClick={p.togglePause}>
            <Icon as={s.paused ? Play : Pause} size={22} className="fill-current" />
            {s.paused ? 'Resume' : 'Pause'}
          </Button>
        ) : (
          <Button variant="primary" size="lg" className="min-w-44" onClick={p.done}>
            <Icon as={Check} size={24} />
            Done
          </Button>
        )}
        <Button size="icon-lg" onClick={p.next} aria-label="Skip step">
          <Icon as={SkipForward} size={22} />
        </Button>
      </nav>

      {help && <Shortcuts close={() => setHelp(false)} />}
    </div>
  );
}

function Demo({ step, caption }: { step: PlayStep; caption: string }) {
  const yt = youtubeEmbed(step.video!);
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-video max-h-[42vh] w-full overflow-hidden rounded-card border border-line bg-surface">
        {yt ? (
          // No sandbox: YouTube needs scripts + same-origin, which a sandbox can't grant together.
          <iframe
            key={yt}
            src={yt}
            title={`${step.name} demo`}
            allow="autoplay; encrypted-media"
            className="pointer-events-none absolute inset-0 size-full border-0"
          />
        ) : (
          <video key={step.video} src={step.video} autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" />
        )}
      </div>
      <figcaption className="text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}

function Shortcuts({ close }: { close: () => void }) {
  return (
    <div role="dialog" aria-modal aria-label="Keyboard shortcuts" className="fixed inset-0 z-10 grid place-items-center p-4">
      <button type="button" aria-label="Close shortcuts" className="absolute inset-0 cursor-default bg-bg/80 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-sm rounded-card border border-line bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-3xl">Shortcuts</h2>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close">
            <Icon as={X} />
          </Button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {SHORTCUTS.map(([k, label]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded-sm border border-line bg-raised px-1.5 py-0.5 font-body text-xs font-semibold">{k}</kbd>
              </dt>
              <dd className="text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function Finished({ workout: w, steps, elapsedMs, again }: { workout: Workout; steps: PlayStep[]; elapsedMs: number; again: () => void }) {
  const moves = steps.filter((x) => !P.isRest(x)).length;
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-card border border-accent bg-surface p-7 shadow-glow">
        <div className="flex flex-col gap-3">
          <Kicker>Workout complete</Kicker>
          <h1 className="font-display text-[clamp(3rem,12vw,4.5rem)]">{w.title}</h1>
        </div>
        <StatGrid>
          <Stat label="Time" value={formatClock(elapsedMs / 1000)} />
          <Stat label="Moves" value={moves} />
        </StatGrid>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-md bg-accent px-4 font-display text-xl text-on-accent hover:bg-accent-hi active:bg-accent-lo"
          >
            Back to workouts
          </Link>
          <Button className="h-12" onClick={again}>
            <Icon as={RotateCcw} size={16} />
            Again
          </Button>
        </div>
      </div>
    </main>
  );
}
