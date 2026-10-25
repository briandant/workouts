export interface Segment {
  /** Relative width. */
  weight: number;
  rest?: boolean;
  /** 0–1 filled. Omit for a static strip. */
  fill?: number;
}

/** A row of proportional segments: the shape of a workout, or progress through it. */
export function Segments({ items, className = 'h-1.5' }: { items: Segment[]; className?: string }) {
  return (
    <div className={`flex gap-0.5 ${className}`} aria-hidden>
      {items.map((s, i) => (
        <span
          key={i}
          style={{ flexGrow: s.weight }}
          className={`relative min-w-px basis-0 overflow-hidden rounded-[1px] ${
            s.fill === undefined ? (s.rest ? 'bg-line' : 'bg-accent') : 'bg-ink/12'
          }`}
        >
          {s.fill !== undefined && (
            <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${(s.fill * 100).toFixed(2)}%` }} />
          )}
        </span>
      ))}
    </div>
  );
}
