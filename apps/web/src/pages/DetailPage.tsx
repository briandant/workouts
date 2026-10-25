import { describeStep, formatClock, formatMinutes } from '@workouts/core';
import { ChevronLeft, Play, RotateCcw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button.tsx';
import { Icon } from '../components/ui/Icon.tsx';
import { Kicker } from '../components/ui/Kicker.tsx';
import { Segments } from '../components/ui/Segments.tsx';
import { Stat, StatGrid } from '../components/ui/Stat.tsx';
import { shape, stats } from '../components/workouts/shape.ts';
import { findWorkout } from '../data/workouts.ts';
import { unlock } from '../player/audio.ts';
import { loadResume } from '../player/storage.ts';
import { NotFound } from './NotFound.tsx';

export function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const w = findWorkout(id);
  if (!w) return <NotFound />;
  const s = stats(w);
  const resume = loadResume(w.id);

  const play = (fresh: boolean) => {
    unlock();
    navigate(`/w/${w.id}/play`, { state: { fresh } });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-20 sm:px-6">
      <Link to="/" className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-muted hover:text-ink">
        <Icon as={ChevronLeft} size={18} />
        All workouts
      </Link>

      <div className="mt-6 grid items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section className="flex flex-col gap-6 lg:sticky lg:top-6">
          <div className="flex flex-col gap-3">
            <Kicker>
              {w.focus} · {w.level}
            </Kicker>
            <h1 className="font-display text-[clamp(3.25rem,10vw,6rem)] text-balance">{w.title}</h1>
            <p className="max-w-[44ch] text-lg text-pretty text-muted">{w.summary}</p>
          </div>

          <StatGrid>
            <Stat label="Duration" value={formatMinutes(s.totalSeconds)} />
            <Stat label="Moves" value={s.moves} />
            <Stat label="Blocks" value={s.blocks} />
          </StatGrid>

          <div className="flex flex-col gap-2">
            <Segments items={shape(w)} className="h-2.5" />
            <div className="flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[2px] bg-accent" />
                Work
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[2px] bg-line" />
                Rest
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="primary" size="lg" className="w-full" onClick={() => play(true)}>
              <Icon as={Play} size={24} className="fill-current" />
              Start workout
            </Button>
            {resume && (
              <Button className="w-full" onClick={() => play(false)}>
                <Icon as={RotateCcw} size={16} />
                Resume at step {resume.idx + 1}
              </Button>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-8">
          {w.blocks.map((b) => {
            let n = 0;
            const sub = b.rounds
              ? `${b.rounds} rounds${b.restBetweenRounds ? ` · ${formatClock(b.restBetweenRounds)} rest between` : ''}`
              : '';
            return (
              <div key={b.id}>
                <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-2">
                  <h2 className="font-display text-3xl">{b.name}</h2>
                  {sub && <span className="text-sm font-medium text-accent">{sub}</span>}
                </div>
                <ol>
                  {b.steps.map((st) => {
                    const rest = st.kind === 'rest';
                    const cue = rest
                      ? ''
                      : [st.kind === 'sets' && st.rest ? `${formatClock(st.rest)} rest between sets` : '', st.cue ?? '']
                          .filter(Boolean)
                          .join(' · ');
                    return (
                      <li
                        key={st.id}
                        className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-line py-3 ${rest ? 'text-muted' : ''}`}
                      >
                        <span className="text-xs text-faint tabular-nums">{rest ? '' : String(++n).padStart(2, '0')}</span>
                        <div>
                          <div className="font-medium">{rest ? 'Rest' : st.name}</div>
                          {cue && <div className="text-sm text-muted">{cue}</div>}
                        </div>
                        <span className="font-display text-xl whitespace-nowrap tabular-nums">{describeStep(st)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
