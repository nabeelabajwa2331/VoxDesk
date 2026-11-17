import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('flex min-w-0 flex-col rounded-lg border border-line bg-raised', className)} {...rest} />;
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
}

export function CardHeader({ title, description, action, id }: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6 pb-4">
      <div className="min-w-0">
        <h2 id={id} className="type-heading-sm">
          {title}
        </h2>
        {description && <p className="mt-0.5 type-body-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function Kpi({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-raised p-6">
      <span className="type-label text-ink-muted">{label}</span>
      <span className="type-heading-lg break-words">{value}</span>
      {note && <span className="type-body-sm text-ink-muted">{note}</span>}
    </div>
  );
}

export function KpiGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section aria-label={label} className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-6">
      {children}
    </section>
  );
}
