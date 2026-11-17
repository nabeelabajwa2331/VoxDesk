import type { ReactNode } from 'react';
import type { Appointment } from '../../types/domain';
import { cn } from '../../lib/cn';
import { useFormat } from '../auth/AuthProvider';
import { StatusBadge } from '../appointments/status';

export interface DayItem {
  kind: 'appointment' | 'gap' | 'break';
  start: string;
  end?: string;
  appointment?: Appointment;
  label?: string;
}

interface Props {
  items: DayItem[];
  nowIso: string;
  detail: (a: Appointment) => string;
  onOpen: (a: Appointment) => void;
  action?: (a: Appointment) => ReactNode;
}

/** A day in time order with a marker for the current time. */
export function DayList({ items, nowIso, detail, onOpen, action }: Props) {
  const fmt = useFormat();
  const nowIndex = items.findIndex((i) => i.start > nowIso);
  const rows: ReactNode[] = [];

  items.forEach((item, i) => {
    if (i === nowIndex) rows.push(<NowLine key="now" label={fmt.time(nowIso)} />);
    if (item.kind === 'appointment' && item.appointment) {
      const a = item.appointment;
      const done = a.status === 'COMPLETED' || a.status === 'NO_SHOW';
      rows.push(
        <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-6 py-3 max-sm:px-4">
          <span className={cn('w-18 shrink-0 type-body-sm font-semibold', done && 'font-normal text-ink-muted')}>{fmt.time(a.start)}</span>
          <button type="button" onClick={() => onOpen(a)} className="flex min-w-0 flex-1 flex-col text-left">
            <span className={cn('truncate font-semibold hover:text-brand-strong', done && 'font-normal text-ink-muted')}>{a.customerName}</span>
            <span className="truncate type-body-sm text-ink-muted">{detail(a)}</span>
          </button>
          <span className="flex shrink-0 items-center gap-3">
            <StatusBadge appointment={a} />
            {action?.(a)}
          </span>
        </li>,
      );
    } else {
      rows.push(
        <li key={`${item.kind}-${item.start}`} className={cn('flex items-center gap-4 border-t border-line px-6 py-3 type-body-sm text-ink-muted max-sm:px-4', item.kind === 'break' && 'bg-surface')}>
          <span className="w-18 shrink-0 font-semibold">{fmt.time(item.start)}</span>
          <span>{item.label}</span>
          <span className="flex-1 border-t border-dashed border-line-strong" aria-hidden="true" />
        </li>,
      );
    }
  });
  if (nowIndex === -1 && items.length && items[items.length - 1]!.start <= nowIso) rows.push(<NowLine key="now" label={fmt.time(nowIso)} />);

  return <ul className="pb-2">{rows}</ul>;
}

function NowLine({ label }: { label: string }) {
  return (
    <li className="relative z-[1] flex h-0 items-center gap-3 px-6" aria-label={`Current time ${label}`}>
      <span className="rounded-full bg-brand px-2 py-0.5 type-caption font-semibold text-on-brand">{label}</span>
      <span className="h-0.5 flex-1 bg-brand" aria-hidden="true" />
    </li>
  );
}
