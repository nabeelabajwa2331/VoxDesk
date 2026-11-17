import { useState } from 'react';
import { api } from '../../api';
import { useQuery } from '../../lib/query';
import { useNow } from '../../lib/useNow';
import { addDays, todayKey, zonedToUtc } from '../../lib/time';
import { useFormat, useSession } from '../auth/AuthProvider';
import { Card, CardHeader, Kpi, KpiGrid } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Segmented } from '../../components/ui/Segmented';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, Loading, QueryView } from '../../components/ui/States';
import { AppointmentDrawer } from '../appointments/AppointmentDrawer';
import { AppointmentList } from '../appointments/AppointmentList';
import { NewBookingButton } from '../booking/BookingDialog';
import { BarChart } from '../analytics/BarChart';
import { StaffPerformance, change, dailyChartData, periodRange, type PeriodId } from '../analytics/AnalyticsPage';
import { ActivityFeed } from './ActivityFeed';
import { DayList } from './DayList';

type Period = Extract<PeriodId, 'today' | 'week' | 'month'>;
const PERIOD_TEXT: Record<Period, { label: string; prev: string }> = {
  today: { label: 'Today', prev: 'the day before' },
  week: { label: 'This week so far', prev: 'the week before' },
  month: { label: 'This month so far', prev: 'the month before' },
};

export function OwnerOverview() {
  const { business } = useSession();
  const fmt = useFormat();
  const tz = business.timeZone;
  const today = todayKey(tz);
  const nowIso = new Date(useNow()).toISOString();
  const [period, setPeriod] = useState<Period>('month');
  const [openId, setOpenId] = useState<string | null>(null);
  const range = periodRange(period, today);
  const at = (k: string) => zonedToUtc(k, '00:00', tz).toISOString();

  const stats = useQuery(['analytics', 'appointments'], () => api.analytics.get(range), [range.from, range.to]);
  const trend = useQuery(['analytics', 'appointments'], () => api.analytics.get({ from: addDays(today, -13), to: today }), [today]);
  const todays = useQuery(['appointments'], () => api.appointments.list({ from: at(today), to: at(addDays(today, 1)), status: ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] }), [today]);
  const upcoming = useQuery(['appointments'], () => api.appointments.list({ from: at(addDays(today, 1)), to: at(addDays(today, 4)), status: ['PENDING', 'CONFIRMED'] }), [today]);

  const s = stats.data;
  const prev = PERIOD_TEXT[period].prev;

  return (
    <Page>
      <PageHeader
        title="Overview"
        description={`${fmt.date(nowIso)} · ${PERIOD_TEXT[period].label}`}
        actions={
          <>
            <Segmented<Period>
              label="Period"
              value={period}
              onChange={setPeriod}
              className="flex-1 sm:flex-none"
              options={[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
              ]}
            />
            <NewBookingButton />
          </>
        }
      />

      {stats.error && !s ? (
        <Card>
          <ErrorState error={stats.error} onRetry={stats.reload} />
        </Card>
      ) : (
        <KpiGrid label="Key figures">
          <Kpi label="Total appointments" value={s ? s.appointments : '–'} note={s && change(s.appointments, s.previous.appointments, prev)} />
          <Kpi label="Confirmed" value={s ? s.confirmed : '–'} note={s && s.appointments ? `${Math.round((s.confirmed / s.appointments) * 100)}% of all appointments` : undefined} />
          <Kpi label="Cancellations" value={s ? s.cancellations : '–'} note={s && `${fmt.percent(s.cancellationRate)} rate, ${fmt.percent(s.previous.cancellationRate)} ${prev}`} />
          <Kpi label="Total revenue" value={s ? fmt.money(s.revenue) : '–'} note={s && change(s.revenue, s.previous.revenue, prev)} />
        </KpiGrid>
      )}

      <div className="flex flex-wrap gap-6">
        <Card className="min-w-0 flex-[2_1_560px]">
          <CardHeader title="Appointment activity" description="Appointments per day, last 14 days" />
          <div className="px-6 pb-6">
            {trend.data ? (
              <BarChart
                series={[
                  { key: 'booked', label: 'Booked', className: 'bg-brand' },
                  { key: 'cancelled', label: 'Cancelled', className: 'bg-peacock' },
                ]}
                data={dailyChartData(trend.data, today)}
                summary={`Appointments per day for the last 14 days: ${trend.data.appointments} in total, ${trend.data.cancellations} cancelled.`}
              />
            ) : trend.error ? (
              <ErrorState error={trend.error} onRetry={trend.reload} />
            ) : (
              <Loading rows={4} />
            )}
          </div>
        </Card>

        <Card className="min-w-0 flex-[1_1_340px]">
          <CardHeader
            title="Today"
            description={todays.data ? `${todays.data.length} appointments` : ' '}
            action={<ButtonLink to="/owner/calendar" variant="ghost" size="sm">Open calendar</ButtonLink>}
          />
          <QueryView query={todays} isEmpty={(d) => d.length === 0} empty={<EmptyState title="Nothing booked today" />}>
            {(list) => (
              <DayList
                items={list.map((a) => ({ kind: 'appointment', start: a.start, appointment: a }))}
                nowIso={nowIso}
                detail={(a) => `${a.serviceName} with ${a.staffName.split(' ')[0]}`}
                onOpen={(a) => setOpenId(a.id)}
              />
            )}
          </QueryView>
        </Card>
      </div>

      <div className="flex flex-wrap gap-6">
        <Card className="min-w-0 flex-[2_1_560px]">
          <CardHeader title="Upcoming" description="Next 3 days" action={<ButtonLink to="/owner/appointments" variant="ghost" size="sm">All appointments</ButtonLink>} />
          <QueryView query={upcoming} isEmpty={(d) => d.length === 0} empty={<EmptyState title="Nothing booked for the next 3 days" />}>
            {(list) => <AppointmentList caption="Upcoming appointments" appointments={list.slice(0, 8)} onOpen={(a) => setOpenId(a.id)} columns={{ staff: true, source: true }} />}
          </QueryView>
        </Card>
        <Card className="min-w-0 flex-[1_1_340px]">
          <CardHeader title="Recent activity" description="Who did what, newest first" />
          <ActivityFeed />
        </Card>
      </div>

      {s && <StaffPerformance data={s} action={<ButtonLink to="/owner/staff" variant="ghost" size="sm">Manage staff</ButtonLink>} />}

      <AppointmentDrawer appointmentId={openId} onClose={() => setOpenId(null)} />
    </Page>
  );
}
