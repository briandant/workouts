import type { ReactNode } from 'react';

export function Kicker({ children }: { children: ReactNode }) {
  return <div className="text-xs font-bold tracking-[0.16em] text-accent uppercase">{children}</div>;
}
