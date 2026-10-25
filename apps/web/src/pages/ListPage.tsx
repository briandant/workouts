import { formatMinutes } from '@workouts/core';
import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { shape, stats } from '../components/workouts/shape.ts';
import { Icon } from '../components/ui/Icon.tsx';
import { Kicker } from '../components/ui/Kicker.tsx';
import { Segments } from '../components/ui/Segments.tsx';
import { workouts } from '../data/workouts.ts';

export function ListPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-20 sm:px-6">
      <header className="flex items-center justify-between">
        <span className="font-display text-xl tracking-wide">
          Follow<span className="text-accent">-</span>along
        </span>
        <span className="text-sm text-muted">{workouts.length} workouts</span>
      </header>

      <h1 className="mt-10 mb-8 font-display text-[clamp(3.5rem,13vw,7.5rem)]">
        Work<span className="text-accent">outs</span>
      </h1>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workouts.map((w) => {
          const s = stats(w);
          return (
            <li key={w.id}>
              <Link
                to={`/w/${w.id}`}
                className="group flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-5 transition hover:border-accent hover:bg-raised"
              >
                <Kicker>{w.focus}</Kicker>
                <span className="font-display text-4xl transition-colors group-hover:text-accent">{w.title}</span>
                <span className="text-sm text-muted">{w.summary}</span>
                <Segments items={shape(w)} className="mt-auto h-1.5 pt-0" />
                <span className="flex items-center gap-4 text-xs font-medium text-muted">
                  <span className="flex items-center gap-1.5">
                    <Icon as={Clock} size={14} />
                    {formatMinutes(s.totalSeconds)}
                  </span>
                  <span>{s.moves} moves</span>
                  <span className="ml-auto">{w.level}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
