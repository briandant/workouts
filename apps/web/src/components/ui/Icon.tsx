import type { LucideIcon } from 'lucide-react';

/** Every icon goes through here so size and stroke stay consistent. */
export function Icon({ as: As, size = 20, className }: { as: LucideIcon; size?: number; className?: string }) {
  return <As size={size} strokeWidth={2} aria-hidden className={className} />;
}
