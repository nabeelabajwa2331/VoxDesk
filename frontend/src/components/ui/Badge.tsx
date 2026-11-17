import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const tones: Record<BadgeTone, string> = {
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
  neutral: 'bg-surface text-ink-muted ring-1 ring-inset ring-line',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 type-caption font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}

export function AiPill({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-sm bg-marigold px-1.5 py-0.5 type-caption font-semibold text-on-accent', className)}>
      AI
    </span>
  );
}

export function CountPill({ count, label, className }: { count: number; label: string; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={label}
      className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marigold px-1.5 type-caption font-semibold text-on-accent', className)}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
