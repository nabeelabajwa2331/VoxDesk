import { useState, type ReactNode } from 'react';
import { api } from '../../api';
import { useQuery } from '../../lib/query';
import { addDays, startOfMonth, startOfWeek, todayKey } from '../../lib/time';
import type { Analytics } from '../../types/domain';
import { useFormat, useSession } from '../auth/AuthProvider';
import { Card, CardHeader, Kpi, KpiGrid } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Segmented } from '../../components/ui/Segmented';
import { ErrorState, Loading } from '../../components/ui/States';
import { BarChart, Meter } from './BarChart';

export type PeriodId = 'today' | 'week' | 'month' | '30d';

export function periodRange(period: PeriodId, today: string) {
  if (period === 'today') return { from: today, to: today };
  if (period === 'week') return { from: startOfWeek(today), to: today };
  if (period === 'month') return { from: startOfMonth(today), to: today };
  return { from: addDays(today, -29), to: today };
}

export function change(current: number, previous: number, previousLabel: string) {
  if (!previous) return current ? `No data for ${previousLabel}` : undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return `Same as ${previousLabel}`;
  return `${pct > 0 ? 'Up' : 'Down'} ${Math.abs(pct)}% on ${previousLabel}`;
}

export function dailyChartData(a: Analytics, today: string) {
  return a.daily.map((d) => ({
    label: d.date === today ? 'Today' : String(Number(d.date.slice(8))),
    highlight: d.date === today,
    values: { booked: d.booked, cancelled: d.cancelled, revenue: d.revenue },
  }));
}

export function AnalyticsPage() {
  const { business } = useSession();
  const today = todayKey(business.timeZone);
  const [period, setPeriod] = useState<Exclude<PeriodId, 'today'>>('month');
  const range = periodRange(period, today);
  const q = useQuery(['analytics', 'appointments'], () => api.analytics.get(range), [range.from, range.to]);

  return (
    <Page>
      <PageHeader
        title="Revenue & analytics"
        description="Only you, as the owner, can see these figures."
        actions={
          <Segmented<Exclude<PeriodId, 'today'>>
            label="Period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'week', label: 'This week' },
              { value: 'month', label: 'This month' },
              { value: '30d', label: 'Last 30 days' },
            ]}
          />
        }
      />
      {q.error && !q.data ? (
        <Card>
          <ErrorState error={q.error} onRetry={q.reload} />
        </Card>
      ) : !q.data ? (
        <Card>
          <Loading rows={6} />
        </Card>
      ) : (
        <AnalyticsBody data={q.data} today={today} />
      )}
    </Page>
  );
}

function AnalyticsBody({ data, today }: { data: Analytics; today: string }) {
  const fmt = useFormat();
  const prev = 'the period before';
  const avg = data.confirmed ? data.revenue / data.confirmed : 0;
  const chart = dailyChartData(data, today);
  const th = 'px-3 py-3 text-left type-label text-ink-muted whitespace-nowrap first:pl-6 last:pr-6';
  const td = 'px-3 py-3 whitespace-nowrap first:pl-6 last:pr-6';
  const topRevenue = Math.max(1, ...data.services.map((s) => s.revenue));

  return (
    <>
      <KpiGrid label="Key figures">
        <Kpi label="Revenue" value={fmt.money(data.revenue)} note={change(data.revenue, data.previous.revenue, prev)} />
        <Kpi label="Appointments" value={data.appointments} note={change(data.appointments, data.previous.appointments, prev)} />
        <Kpi
          label="Cancellation rate"
          value={fmt.percent(data.cancellationRate)}
          note={`${data.cancellations} cancelled · ${fmt.percent(data.previous.cancellationRate)} the period before`}
        />
        <Kpi label="Average booking value" value={fmt.money(Math.round(avg))} note={`${data.confirmed} paid or confirmed bookings`} />
      </KpiGrid>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Revenue trend" description="Confirmed and completed bookings per day" />
          <div className="px-6 pb-6">
            <BarChart
              series={[{ key: 'revenue', label: 'Revenue', className: 'bg-brand' }]}
              data={chart}
              formatValue={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))}
              summary={`Daily revenue from ${data.from} to ${data.to}. Total ${fmt.money(data.revenue)}.`}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Appointment volume" description="Bookings and cancellations per day" />
          <div className="px-6 pb-6">
            <BarChart
              series={[
                { key: 'booked', label: 'Booked', className: 'bg-brand' },
                { key: 'cancelled', label: 'Cancelled', className: 'bg-peacock' },
              ]}
              data={chart}
              summary={`Daily appointments from ${data.from} to ${data.to}: ${data.appointments} in total, ${data.cancellations} cancelled.`}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Service performance" description="Booked services in this period, highest revenue first" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-t border-line">
                <th scope="col" className={th}>Service</th>
                <th scope="col" className={`${th} text-right`}>Bookings</th>
                <th scope="col" className={`${th} text-right`}>Revenue</th>
                <th scope="col" className={`${th} w-1/3`}>Share of top service</th>
              </tr>
            </thead>
            <tbody>
              {data.services.map((s) => (
                <tr key={s.serviceId} className="border-t border-line">
                  <td className={`${td} font-semibold`}>{s.name}</td>
                  <td className={`${td} text-right`}>{s.count}</td>
                  <td className={`${td} text-right`}>{fmt.money(s.revenue)}</td>
                  <td className={td}>
                    <Meter value={s.revenue / topRevenue} label={`${s.name} revenue compared with the top service`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <StaffPerformance data={data} />
    </>
  );
}

export function StaffPerformance({ data, action }: { data: Analytics; action?: ReactNode }) {
  const fmt = useFormat();
  const th = 'px-3 py-3 text-left type-label text-ink-muted whitespace-nowrap first:pl-6 last:pr-6';
  const td = 'px-3 py-3 whitespace-nowrap first:pl-6 last:pr-6';
  return (
    <Card>
      <CardHeader title="Staff performance" description="Booked hours are the share of each person’s working time that was booked" action={action} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr className="border-t border-line">
              <th scope="col" className={th}>Staff member</th>
              <th scope="col" className={`${th} text-right`}>Appointments</th>
              <th scope="col" className={`${th} w-1/4`}>Booked hours</th>
              <th scope="col" className={`${th} text-right`}>Revenue</th>
              <th scope="col" className={`${th} text-right`}>Cancellation rate</th>
            </tr>
          </thead>
          <tbody>
            {data.staff.map((s) => (
              <tr key={s.staffId} className="border-t border-line">
                <td className={td}>
                  <span className="font-semibold">{s.name}</span>
                  <span className="block type-body-sm text-ink-muted">{s.title}</span>
                </td>
                <td className={`${td} text-right`}>{s.count}</td>
                <td className={td}>
                  <Meter value={s.utilisation} label={`${s.name} booked hours`} />
                </td>
                <td className={`${td} text-right`}>{fmt.money(s.revenue)}</td>
                <td className={`${td} text-right`}>{fmt.percent(s.cancellationRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
