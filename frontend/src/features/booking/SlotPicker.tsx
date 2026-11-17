import { api } from '../../api';
import { useQuery } from '../../lib/query';
import { minutesOfDay } from '../../lib/time';
import { cn } from '../../lib/cn';
import type { Slot } from '../../types/domain';
import { useFormat } from '../auth/AuthProvider';
import { EmptyState, ErrorState, Loading } from '../../components/ui/States';
import { CalendarX } from '../../components/icons';

interface Props {
  serviceId: string;
  date: string;
  staffId?: string;
  excludeAppointmentId?: string;
  value: Slot | null;
  onChange: (slot: Slot) => void;
}

const slotKey = (s: Slot) => `${s.staffId}|${s.start}`;

/** Shows the free times the backend returns. The browser never decides a time is free. */
export function SlotPicker({ serviceId, date, staffId, excludeAppointmentId, value, onChange }: Props) {
  const fmt = useFormat();
  const q = useQuery(
    ['availability', 'appointments'],
    () => api.appointments.availability({ serviceId, date, staffId, excludeAppointmentId }),
    [serviceId, date, staffId, excludeAppointmentId],
  );

  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />;
  if (q.loading || !q.data) return <Loading label="Checking free times" rows={3} />;
  if (!q.data.length) {
    return (
      <EmptyState
        icon={<CalendarX size={20} strokeWidth={1.75} aria-hidden="true" />}
        title="No free times on this day"
        body="Try another date or another staff member."
      />
    );
  }

  const groups: { label: string; slots: Slot[] }[] = [
    { label: 'Morning', slots: [] },
    { label: 'Afternoon', slots: [] },
    { label: 'Evening', slots: [] },
  ];
  for (const s of q.data) {
    const m = minutesOfDay(s.start, fmt.timeZone);
    groups[m < 12 * 60 ? 0 : m < 17 * 60 ? 1 : 2]!.slots.push(s);
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">Free times</legend>
      {groups
        .filter((g) => g.slots.length)
        .map((g) => (
          <div key={g.label} className="flex flex-col gap-2">
            <span className="type-label text-ink-muted">{g.label}</span>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
              {g.slots.map((s) => {
                const selected = value !== null && slotKey(value) === slotKey(s);
                return (
                  <button
                    key={slotKey(s)}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange(s)}
                    className={cn(
                      'flex min-h-11 flex-col items-center justify-center rounded-md border px-2 py-1.5',
                      selected ? 'border-brand bg-brand text-on-brand' : 'border-line-strong bg-raised hover:bg-surface',
                    )}
                  >
                    <span className="font-semibold">{fmt.time(s.start)}</span>
                    {!staffId && <span className={cn('type-caption', selected ? '' : 'text-ink-muted')}>{s.staffName.split(' ')[0]}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
    </fieldset>
  );
}
