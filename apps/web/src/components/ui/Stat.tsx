import type { ReactNode } from 'react';

export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-flow-col auto-cols-fr divide-x divide-line rounded-card border border-line bg-surface">{children}</dl>;
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-display text-4xl tabular-nums">{value}</dd>
    </div>
  );
}
