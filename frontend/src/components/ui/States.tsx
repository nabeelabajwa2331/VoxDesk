import type { ReactNode } from 'react';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { errorMessage } from '../../api/errors';
import type { QueryResult } from '../../lib/query';
import { cn } from '../../lib/cn';

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return <LoaderCircle aria-hidden="true" size={size} strokeWidth={1.75} className={cn('animate-spin', className)} />;
}

export function Loading({ label = 'Loading', rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3 p-6">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-11 animate-pulse rounded-md bg-surface" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      {icon && <div className="mb-1 flex size-12 items-center justify-center rounded-md border border-line bg-surface text-ink-muted">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-md type-body-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="m-6 flex flex-wrap items-start gap-3 rounded-md bg-danger-bg p-4 text-danger-fg">
      <TriangleAlert aria-hidden="true" size={20} strokeWidth={1.75} className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-semibold">Could not load this</p>
        <p className="type-body-sm">{errorMessage(error)}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="min-h-9 rounded-md border border-current px-3 type-body-sm font-semibold">
          Try again
        </button>
      )}
    </div>
  );
}

export function Banner({ tone, children }: { tone: 'danger' | 'warning' | 'success'; children: ReactNode }) {
  const tones = {
    danger: 'bg-danger-bg text-danger-fg',
    warning: 'bg-warning-bg text-warning-fg',
    success: 'bg-success-bg text-success-fg',
  };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-md px-4 py-3 type-body-sm font-semibold', tones[tone])}>
      {children}
    </div>
  );
}

interface QueryViewProps<T> {
  query: QueryResult<T>;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  loadingRows?: number;
  children: (data: T) => ReactNode;
}

/** Renders loading, error and empty states for a query, then the data. */
export function QueryView<T>({ query, isEmpty, empty, loadingRows, children }: QueryViewProps<T>) {
  if (query.error && query.data === undefined) return <ErrorState error={query.error} onRetry={query.reload} />;
  if (query.data === undefined) return <Loading rows={loadingRows} />;
  if (isEmpty?.(query.data) && empty) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
