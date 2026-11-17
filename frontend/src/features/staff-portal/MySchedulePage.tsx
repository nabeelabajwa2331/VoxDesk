import { useState } from 'react';
import { api } from '../../api';
import { useQuery } from '../../lib/query';
import { useNow } from '../../lib/useNow';
import { addDays, dateKey, minutesOfDay, startOfWeek, todayKey, weekdayOf, zonedToUtc } from '../../lib/time';
import { useFormat, useSession } from '../auth/AuthProvider';
import { Card } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Segmented } from '../../components/ui/Segmented';
import { Button, IconButton } from '../../components/ui/Button';
import { ErrorState, Loading } from '../../components/ui/States';
import { ChevronLeft, ChevronRight } from '../../components/icons';
import { AppointmentDrawer } from '../appointments/AppointmentDrawer';
import { TimeGrid, toneFor, type GridColumn } from '../calendar/TimeGrid';

type View = 'day' | 'week';
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MySchedulePage() {
  const { business } = useSession();
  const fmt = useFormat();
  const tz = business.timeZone;
  const today = todayKey(tz);
  const nowIso = new Date(useNow()).toISOString();
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(today);
  const [openId, setOpenId] = useState<string | null>(null);

  const from = view === 'day' ? anchor : startOfWeek(anchor);
  const to = view === 'day' ? anchor : addDays(from, 6);
  const q = useQuery(['schedule', 'appointments'], () => api.me.schedule(from, to), [from, to]);

  const noon = (k: string) => zonedToUtc(k, '12:00', tz).toISOString();
  const title = view === 'day' ? fmt.date(noon(anchor)) : `${fmt.dateShort(noon(from))} to ${fmt.dateShort(noon(to))}`;

  let columns: GridColumn[] = [];
  let startMin = 9 * 60;
  let endMin = 20 * 60;
  if (q.data) {
    const open = q.data.days.filter((d) => d.hours);
    if (open.length) {
      startMin = Math.min(...open.map((d) => minutesOfDay(d.hours!.start, tz)));
      endMin = Math.max(...open.map((d) => minutesOfDay(d.hours!.end, tz) || 24 * 60));
    }
    columns = q.data.days.map((d) => ({
      key: d.date,
      label: `${WEEKDAY_SHORT[weekdayOf(d.date)]} ${Number(d.date.slice(8))}`,
      sublabel: d.hours ? fmt.timeRange(d.hours.start, d.hours.end) : 'Day off',
      highlight: d.date === today,
      closedLabel: d.hours ? undefined : 'Day off',
      open: d.hours ?? undefined,
      blocks: [...d.breaks.map((b) => ({ ...b, kind: 'break' as const })), ...d.unavailable.map((u) => ({ ...u, kind: 'unavailable' as const }))],
      events: q
        .data!.appointments.filter((a) => a.status !== 'CANCELLED' && dateKey(a.start, tz) === d.date)
        .map((a) => ({ id: a.id, start: a.start, end: a.end, title: a.customerName, subtitle: a.serviceName, tone: toneFor(a.status), onClick: () => setOpenId(a.id) })),
    }));
  }

  return (
    <Page>
      <PageHeader title="My schedule" description="Your hours, breaks and bookings. Ask the owner if your hours need to change." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-6">
          <div className="flex items-center gap-2">
            <IconButton label="Previous" onClick={() => setAnchor((a) => addDays(a, view === 'day' ? -1 : -7))}>
              <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
            <Button onClick={() => setAnchor(today)}>Today</Button>
            <IconButton label="Next" onClick={() => setAnchor((a) => addDays(a, view === 'day' ? 1 : 7))}>
              <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
          </div>
          <h2 className="min-w-0 flex-1 type-heading-sm" aria-live="polite">
            {title}
          </h2>
          <Segmented<View>
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-4 px-6 pb-4 type-body-sm text-ink-muted" aria-label="Legend">
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-brand" aria-hidden="true" />Confirmed</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-warning-bg ring-1 ring-warning-fg/40" aria-hidden="true" />Pending</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm border border-dashed border-line-strong bg-surface" aria-hidden="true" />Break</span>
          <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm border border-dashed border-danger-fg/50 bg-danger-bg" aria-hidden="true" />Unavailable</span>
        </div>
        {q.error && !q.data ? (
          <ErrorState error={q.error} onRetry={q.reload} />
        ) : !q.data ? (
          <Loading rows={6} />
        ) : (
          <div className="border-t border-line">
            <TimeGrid columns={columns} startMin={startMin} endMin={endMin} nowIso={nowIso} nowColumns={[today]} />
          </div>
        )}
      </Card>
      <AppointmentDrawer appointmentId={openId} onClose={() => setOpenId(null)} />
    </Page>
  );
}
