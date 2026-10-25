import { Check, Pause, Play, SkipForward } from 'lucide-react';
import { BigClock } from '../components/ui/BigClock.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Icon } from '../components/ui/Icon.tsx';
import { Kicker } from '../components/ui/Kicker.tsx';
import { Segments } from '../components/ui/Segments.tsx';
import { Stat, StatGrid } from '../components/ui/Stat.tsx';
import { Tag } from '../components/ui/Tag.tsx';

const SWATCHES = ['bg', 'surface', 'raised', 'line', 'ink', 'muted', 'faint', 'accent', 'accent-hi', 'accent-lo', 'rest', 'rest-bg'];

/** Dev-only: every base component in every state. */
export default function StyleguidePage() {
  const strip = [30, 10, 30, 10, 45, 15, 30].map((weight, i) => ({ weight, rest: i % 2 === 1 }));
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-10">
      <h1 className="font-display text-7xl">Styleguide</h1>
      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {SWATCHES.map((c) => (
          <div key={c} className="flex flex-col gap-1 text-xs text-muted">
            <span className="h-14 rounded-md border border-line" style={{ background: `var(--color-${c})` }} />
            {c}
          </div>
        ))}
      </section>
      {(['work', 'rest'] as const).map((tone) => (
        <section key={tone} data-tone={tone} className="flex flex-col gap-6 rounded-card bg-bg p-6 ring-1 ring-line">
          <Kicker>{tone} tone</Kicker>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg">
              <Icon as={Play} size={22} className="fill-current" /> Start
            </Button>
            <Button variant="primary" size="lg" disabled>
              <Icon as={Pause} size={22} /> Disabled
            </Button>
            <Button>
              <Icon as={Check} size={16} /> Secondary
            </Button>
            <Button variant="ghost">Ghost</Button>
            <Button size="icon-lg" aria-label="Skip">
              <Icon as={SkipForward} />
            </Button>
          </div>
          <div className="flex gap-3">
            <Tag>Work</Tag>
            <Tag tone="muted">Muted</Tag>
          </div>
          <BigClock text="0:42" className="text-[10rem] text-accent" />
          <Segments items={strip} className="h-2" />
          <Segments items={strip.map((s, i) => ({ ...s, fill: i < 3 ? 1 : i === 3 ? 0.4 : 0 }))} className="h-2" />
          <StatGrid>
            <Stat label="Duration" value="24 min" />
            <Stat label="Moves" value={12} />
            <Stat label="Blocks" value={3} />
          </StatGrid>
        </section>
      ))}
    </div>
  );
}
