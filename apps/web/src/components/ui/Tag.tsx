import type { ReactNode } from 'react';

export function Tag({
  tone = 'accent',
  className = '',
  children,
}: {
  tone?: 'accent' | 'muted';
  className?: string;
  children: ReactNode;
}) {
  const t = tone === 'accent' ? 'bg-accent text-on-accent' : 'border border-line text-muted';
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-bold tracking-[0.12em] uppercase ${t} ${className}`}
    >
      {children}
    </span>
  );
}
