import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../lib/query';
import type { Activity, ActivityKind } from '../../types/domain';
import { useFormat } from '../auth/AuthProvider';
import { AiPill } from '../../components/ui/Badge';
import { EmptyState, QueryView } from '../../components/ui/States';
import { CalendarCheck, CalendarX, Check, MessageCircle, Phone, RefreshCw } from '../../components/icons';

const ICONS: Record<ActivityKind, ComponentType<LucideProps>> = {
  BOOKED: CalendarCheck,
  CONFIRMED: Check,
  CANCELLED: CalendarX,
  CANCEL_REQUESTED: CalendarX,
  RESCHEDULED: RefreshCw,
  TRANSFERRED: Phone,
  ANSWERED: MessageCircle,
};

function byLine(a: Activity) {
  const verb: Partial<Record<ActivityKind, string>> = {
    BOOKED: 'Booked',
    CANCEL_REQUESTED: 'Taken',
    TRANSFERRED: 'Transferred',
    ANSWERED: 'Answered',
    RESCHEDULED: 'Rescheduled',
    CANCELLED: 'Cancelled',
    CONFIRMED: 'Confirmed',
  };
  const v = verb[a.kind] ?? 'Done';
  if (a.actor === 'AI') return `${v} by AI receptionist`;
  if (a.actor === 'ONLINE') return 'Booked online';
  if (a.actor === 'RECEPTION') return `${v} by ${a.actorName ?? 'reception'}`;
  if (a.actor === 'OWNER') return `${v} by ${a.actorName ?? 'the owner'}`;
  return v;
}

export function ActivityFeed({ limit = 6 }: { limit?: number }) {
  const fmt = useFormat();
  const q = useQuery(['activity'], () => api.activity.list(limit), [limit]);
  return (
    <QueryView query={q} isEmpty={(d) => d.length === 0} empty={<EmptyState title="Nothing yet today" />} loadingRows={4}>
      {(items) => (
        <ul className="pb-2">
          {items.map((a) => {
            const Icon = ICONS[a.kind];
            return (
              <li key={a.id} className="flex items-start gap-4 border-t border-line px-6 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink-muted">
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span>{a.text}</span>
                  <span className="flex flex-wrap items-center gap-1.5 type-body-sm text-ink-muted">
                    {a.actor === 'AI' && <AiPill />}
                    {byLine(a)} · {fmt.relative(a.createdAt)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </QueryView>
  );
}
