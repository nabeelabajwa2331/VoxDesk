import { useState } from 'react';
import { api } from '../../api';
import { useQuery } from '../../lib/query';
import { useNow } from '../../lib/useNow';
import { addDays, dateKey, startOfMonth, todayKey, zonedToUtc } from '../../lib/time';
import { useFormat, useSession } from '../auth/AuthProvider';
import { Card, CardHeader, Kpi, KpiGrid } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { ButtonLink } from '../../components/ui/Button';
import { AiPill } from '../../components/ui/Badge';
import { EmptyState, ErrorState, Loading } from '../../components/ui/States';
import { AppointmentDrawer } from '../appointments/AppointmentDrawer';
import { AppointmentList } from '../appointments/AppointmentList';
import { StatusBadge, durationMinutes } from '../appointments/status';
import { DayList } from '../overview/DayList';
import { buildDayItems, workingMinutes } from './dayItems';

export function StaffOverview() {
  const { user, business } = useSession();
  const fmt = useFormat();
  const tz = business.timeZone;
  const today = todayKey(tz);
  const nowIso = new Date(useNow()).toISOString();
  const [openId, setOpenId] = useState<string | null>(null);

  const week = useQuery(['schedule', 'appointments'], () => api.me.schedule(today, addDays(today, 7)), [today]);
  const completed = useQuery(
    ['appointments'],
    () => api.appointments.list({ from: zonedToUtc(startOfMonth(today), '00:00', tz).toISOString(), status: ['COMPLETED'] }),
    [today],
  );

  if (week.error && !week.data) return <ErrorState error={week.error} onRetry={week.reload} />;
  if (!week.data) return <Loading rows={6} />;

  const live = week.data.appointments.filter((a) => a.status !== 'CANCELLED');
  const todays = live.filter((a) => dateKey(a.start, tz) === today);
  const upcoming = live.filter((a) => a.start > nowIso && (a.status === 'PENDING' || a.status === 'CONFIRMED'));
  const next = upcoming[0];
  const todayDay = week.data.days.find((d) => d.date === today);
  const minutes = workingMinutes(todayDay);
  const doneToday = todays.filter((a) => a.end <= nowIso).length;
  const tomorrow = addDays(today, 1);
  const noted = live
    .filter((a) => a.customerNotes && [today, tomorrow].includes(dateKey(a.start, tz)) && a.end > nowIso)
    .filter((a, i, arr) => arr.findIndex((x) => x.customerId === a.customerId) === i);
  const minsUntil = next ? Math.round((new Date(next.start).getTime() - new Date(nowIso).getTime()) / 60_000) : 0;

  return (
    <Page>
      <PageHeader title="My overview" description={`${fmt.date(nowIso)} · Your appointments only`} />

      <KpiGrid label="My numbers">
        <Kpi label="Today’s appointments" value={todays.length} note={`${doneToday} done, ${todays.length - doneToday} to come`} />
        <Kpi label="Upcoming appointments" value={upcoming.length} note="Next 7 days" />
        <Kpi label="Completed this month" value={completed.data ? completed.data.length : '–'} note={`Since 1 ${fmt.monthLabel(startOfMonth(today)).split(' ')[0]}`} />
        <Kpi
          label="Working hours today"
          value={todayDay?.hours ? fmt.duration(minutes) : 'Day off'}
          note={todayDay?.hours ? `${fmt.timeRange(todayDay.hours.start, todayDay.hours.end)}${todayDay.breaks.length ? ', less break' : ''}` : undefined}
        />
      </KpiGrid>

      <Card aria-labelledby="next-title">
        <CardHeader id="next-title" title="Next appointment" action={next ? <StatusBadge appointment={next} /> : undefined} />
        {next ? (
          <div className="flex flex-wrap gap-6 px-6 pb-6">
            <div className="flex min-w-40 flex-col gap-1">
              <span className="type-heading-lg text-brand-strong">{fmt.time(next.start)}</span>
              <span className="type-body-sm text-ink-muted">
                {minsUntil < 60 * 24 ? (minsUntil <= 0 ? 'Starting now' : `In ${fmt.duration(minsUntil)}`) : fmt.dayLabel(dateKey(next.start, tz))} · {fmt.duration(durationMinutes(next))} long
              </span>
            </div>
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-3">
              <div>
                <button type="button" onClick={() => setOpenId(next.id)} className="type-heading-md text-left hover:text-brand-strong">
                  {next.customerName}
                </button>
                <p className="text-ink-muted">
                  {next.serviceName} · Ends {fmt.time(next.end)}
                </p>
              </div>
              <p className="flex flex-wrap items-center gap-1.5 type-body-sm text-ink-muted">
                {next.source === 'AI_CALL' && <AiPill />}
                {next.source === 'AI_CALL' ? 'Booked by AI receptionist' : 'Booked'} on {fmt.dateShort(next.createdAt)}
              </p>
              {next.customerNotes && (
                <div className="rounded-md border border-line bg-surface px-4 py-3 type-body-sm">
                  <b className="block type-label text-ink-muted">Customer note</b>
                  {next.customerNotes}
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState title="No more appointments booked" body="New bookings with you will show here." />
        )}
      </Card>

      <div className="flex flex-wrap gap-6">
        <Card className="min-w-0 flex-[2_1_560px]">
          <CardHeader
            title="Today’s schedule"
            description={todayDay?.hours ? fmt.timeRange(todayDay.hours.start, todayDay.hours.end) : 'Not working today'}
            action={<ButtonLink to="/staff/schedule" variant="ghost" size="sm">Week view</ButtonLink>}
          />
          {todayDay?.hours || todays.length ? (
            <DayList
              items={buildDayItems(todayDay, todays, fmt.time)}
              nowIso={nowIso}
              detail={(a) => `${a.serviceName} · ${fmt.duration(durationMinutes(a))}`}
              onOpen={(a) => setOpenId(a.id)}
            />
          ) : (
            <EmptyState title="Day off" body={`Enjoy your day, ${user.name.split(' ')[0]}.`} />
          )}
        </Card>
        <Card className="min-w-0 flex-[1_1_340px]">
          <CardHeader title="Customer notes" description="For today and tomorrow" />
          {noted.length ? (
            <ul className="flex flex-col gap-3 px-6 pb-6">
              {noted.map((a) => (
                <li key={a.id} className="rounded-md border border-line bg-surface px-4 py-3 type-body-sm">
                  <b className="block type-label text-ink-muted">
                    {a.customerName} · {fmt.dayLabel(dateKey(a.start, tz))} {fmt.time(a.start)}
                  </b>
                  {a.customerNotes}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No notes for your next customers" />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Upcoming bookings" description="Next 7 days" action={<ButtonLink to="/staff/appointments" variant="ghost" size="sm">My appointments</ButtonLink>} />
        {upcoming.length ? (
          <AppointmentList caption="Upcoming bookings" appointments={upcoming.slice(0, 10)} onOpen={(a) => setOpenId(a.id)} columns={{ duration: true }} />
        ) : (
          <EmptyState title="Nothing booked for the next 7 days" />
        )}
      </Card>

      <AppointmentDrawer appointmentId={openId} onClose={() => setOpenId(null)} />
    </Page>
  );
}
