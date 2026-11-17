import { cn } from '../../lib/cn';

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-surface font-semibold text-ink',
        size === 'sm' ? 'size-8 type-caption' : 'size-9 type-body-sm',
      )}
    >
      {initials(name)}
    </span>
  );
}
