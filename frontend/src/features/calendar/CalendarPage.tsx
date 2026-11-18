import { useState } from 'react';
import { api } from '../../api';
import { useQuery } from '../../lib/query';
import { useNow } from '../../lib/useNow';
import { isNarrowScreen } from '../../lib/media';
import { addDays, addMonths, dateKey, startOfMonth, startOfWeek, timeToMinutes, todayKey, weekdayOf, zonedToUtc } from '../../lib/time';
import { cn } from '../../lib/cn';
import type { Appointment, StaffMember } from '../../types/domain';
import { useFormat, useSession } from '../auth/AuthProvider';
import { Card } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Segmented } from '../../components/ui/Segmented';
import { Button, IconButton } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/Field';
import { ErrorState, Loading } from '../../components/ui/States';
import { ChevronLeft, ChevronRight } from '../../components/icons';
import { AppointmentDrawer } from '../appointments/AppointmentDrawer';
import { NewBookingButton } from '../booking/BookingDialog';
import { TimeGrid, toneFor, type GridColumn } from './TimeGrid';

type View = 'day' | 'week' | 'month';
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarPage() {
  const { business } = useSession();
  const fmt = useFormat();
  const tz = business.timeZone;
  const today = todayKey(tz);
  const nowIso = new Date(useNow()).toISOString();
  const [view, setView] = useState<View>(() => (isNarrowScreen() ? 'day' : 'week'));
  const [anchor, setAnchor] = useState(today);
  const [staffId, setStaffId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const staff = useQuery(['staff'], () => api.staff.list(), []);
  const services = useQuery(['services'], () => api.services.list(), []);

  let from: string;
  let days: number;
  if (view === 'day') {
    from = anchor;
    days = 1;
  } else if (view === 'week') {
    from = startOfWeek(anchor);
    days = 7;
  } else {
    from = startOfWeek(startOfMonth(anchor));
    days = 42;
  }
  const to = addDays(from, days);
  const rangeQuery = {
    from: zonedToUtc(from, '00:00', tz).toISOString(),
    to: zonedToUtc(to, '00:00', tz).toISOString(),
    staffId: staffId || undefined,
    serviceId: serviceId || undefined,
    status: ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] as Appointment['status'][],
  };
  const appts = useQuery(['appointments'], () => api.appointments.list(rangeQuery), [JSON.stringify(rangeQuery)]);

  const step = (dir: 1 | -1) => {
    if (view === 'day') setAnchor((a) => addDays(a, dir));
    else if (view === 'week') setAnchor((a) => addDays(a, 7 * dir));
    else setAnchor((a) => addMonths(a, dir));
  };

  const title =
    view === 'day'
      ? fmt.date(zonedToUtc(anchor, '12:00', tz).toISOString())
      : view === 'week'
        ? `${fmt.dateShort(zonedToUtc(from, '12:00', tz).toISOString())} to ${fmt.dateShort(zonedToUtc(addDays(from, 6), '12:00', tz).toISOString())}`
        : fmt.monthLabel(startOfMonth(anchor));

  const hours = business.workingHours.filter(Boolean) as { open: string; close: string }[];
  const startMin = Math.min(...hours.map((h) => timeToMinutes(h.open)), 9 * 60);
  const endMin = Math.max(...hours.map((h) => timeToMinutes(h.close)), 19 * 60);

  const toEvent = (a: Appointment, withStaff: boolean) => ({
    id: a.id,
    start: a.start,
    end: a.end,
    title: a.customerName,
    subtitle: withStaff ? `${a.serviceName} · ${a.staffName.split(' ')[0]}` : a.serviceName,
    tone: toneFor(a.status),
    onClick: () => setOpenId(a.id),
  });

  function columns(list: Appointment[], staffList: StaffMember[]): GridColumn[] {
    if (view === 'day') {
      const wd = weekdayOf(anchor);
      return staffList
        .filter((s) => s.active && (!staffId || s.id === staffId))
        .map((s) => {
          const h = s.workingHours[wd];
          return {
            key: s.id,
            label: s.name,
            sublabel: h ? `${fmt.time(zonedToUtc(anchor, h.open, tz).toISOString())} to ${fmt.time(zonedToUtc(anchor, h.close, tz).toISOString())}` : 'Day off',
            closedLabel: h ? undefined : 'Day off',
            open: h ? { start: zonedToUtc(anchor, h.open, tz).toISOString(), end: zonedToUtc(anchor, h.close, tz).toISOString() } : undefined,
            events: list.filter((a) => a.staffId === s.id).map((a) => toEvent(a, false)),
            blocks: [],
          };
        });
    }
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDays(from, i);
      const h = business.workingHours[weekdayOf(key)];
      return {
        key,
        label: `${WEEKDAY_SHORT[i]} ${Number(key.slice(8))}`,
        highlight: key === today,
        closedLabel: h ? undefined : 'Closed',
        open: h ? { start: zonedToUtc(key, h.open, tz).toISOString(), end: zonedToUtc(key, h.close, tz).toISOString() } : undefined,
        events: list.filter((a) => dateKey(a.start, tz) === key).map((a) => toEvent(a, true)),
        blocks: [],
      };
    });
  }

  return (
    <Page>
      <PageHeader title="Calendar" description="Every booking across your team." actions={<NewBookingButton />} />
      <Card>
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <IconButton label="Previous" onClick={() => step(-1)}>
                <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
              <Button onClick={() => setAnchor(today)}>Today</Button>
              <IconButton label="Next" onClick={() => step(1)}>
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
                { value: 'month', label: 'Month' },
              ]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
            <SelectField label="Staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Everyone</option>
              {(staff.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Service" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">All services</option>
              {(services.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="flex flex-wrap gap-4 type-body-sm text-ink-muted" aria-label="Legend">
            <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-brand" aria-hidden="true" />Confirmed</span>
            <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-warning-bg ring-1 ring-warning-fg/40" aria-hidden="true" />Pending</span>
            <span className="flex items-center gap-1.5"><i className="size-3 rounded-sm bg-surface ring-1 ring-line" aria-hidden="true" />Completed or no-show</span>
          </div>
        </div>

        {appts.error && !appts.data ? (
          <ErrorState error={appts.error} onRetry={appts.reload} />
        ) : !appts.data || !staff.data ? (
          <Loading rows={6} />
        ) : view === 'month' ? (
          <MonthGrid
            from={from}
            month={anchor.slice(0, 7)}
            today={today}
            appointments={appts.data}
            onOpen={setOpenId}
            onDay={(k) => {
              setAnchor(k);
              setView('day');
            }}
          />
        ) : (
          <div className={cn('border-t border-line', appts.loading && 'opacity-70')}>
            <TimeGrid
              columns={columns(appts.data, staff.data)}
              startMin={startMin}
              endMin={endMin}
              nowIso={nowIso}
              nowColumns={view === 'day' ? (anchor === today ? (staff.data ?? []).map((s) => s.id) : []) : [today]}
            />
          </div>
        )}
      </Card>
      <AppointmentDrawer appointmentId={openId} onClose={() => setOpenId(null)} />
    </Page>
  );
}

function MonthGrid({
  from,
  month,
  today,
  appointments,
  onOpen,
  onDay,
}: {
  from: string;
  month: string;
  today: string;
  appointments: Appointment[];
  onOpen: (id: string) => void;
  onDay: (key: string) => void;
}) {
  const fmt = useFormat();
  const cells = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  return (
    <div className="overflow-x-auto border-t border-line">
      <div className="grid min-w-[700px] grid-cols-7">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="border-b border-line px-3 py-2 type-label text-ink-muted">
            {d}
          </div>
        ))}
        {cells.map((key) => {
          const list = appointments.filter((a) => dateKey(a.start, fmt.timeZone) === key);
          const inMonth = key.startsWith(month);
          return (
            <div key={key} className={cn('flex min-h-28 flex-col gap-1 border-b border-l border-line p-2 first:border-l-0', !inMonth && 'bg-surface')}>
              <button
                type="button"
                onClick={() => onDay(key)}
                aria-label={`Open ${fmt.dayLabel(key)}`}
                className={cn(
                  'self-start rounded-full px-2 type-body-sm font-semibold',
                  key === today ? 'bg-brand text-on-brand' : inMonth ? 'text-ink' : 'text-ink-muted',
                )}
              >
                {Number(key.slice(8))}
              </button>
              {list.slice(0, 3).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onOpen(a.id)}
                  className="truncate rounded-sm px-1 text-left type-caption hover:bg-surface"
                >
                  <span className="font-semibold">{fmt.time(a.start)}</span> {a.customerName}
                </button>
              ))}
              {list.length > 3 && (
                <button type="button" onClick={() => onDay(key)} className="self-start px-1 type-caption font-semibold text-brand-strong">
                  {list.length - 3} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
