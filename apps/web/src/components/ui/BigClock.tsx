/** Giant timer numerals in fixed-width cells, so the digits don't shift as they change. */
export function BigClock({ text, dim = false, className = '' }: { text: string; dim?: boolean; className?: string }) {
  return (
    <span
      role="timer"
      aria-label={text}
      className={`font-display leading-[0.8] transition-opacity ${dim ? 'opacity-35' : ''} ${className}`}
    >
      {[...text].map((ch, i) => (
        <span key={i} aria-hidden className={ch === ':' ? 'clock-sep' : 'clock-cell'}>
          {ch}
        </span>
      ))}
    </span>
  );
}
