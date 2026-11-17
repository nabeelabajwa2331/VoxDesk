import { useState } from 'react';
import { api, errorMessage } from '../../api';
import { useMutation, useQuery } from '../../lib/query';
import { useNow } from '../../lib/useNow';
import { addDays, todayKey, zonedToUtc } from '../../lib/time';
import type { Appointment } from '../../types/domain';
import { useFormat, useSession } from '../auth/AuthProvider';
import { Card, CardHeader, Kpi, KpiGrid } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, QueryView } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { AppointmentDrawer } from '../appointments/AppointmentDrawer';
import { AppointmentList } from '../appointments/AppointmentList';
import { NewBookingButton } from '../booking/BookingDialog';
import { ActivityFeed } from './ActivityFeed';
import { DayList } from './DayList';

function ConfirmButton({ appointment }: { appointment: Appointment }) {
  const toast = useToast();
  const confirm = useMutation(() => api.appointments.setStatus(appointment.id, 'CONFIRMED'), { invalidates: ['appointments', 'activity'] });
  return (
    <Button
      size="sm"
      className="max-sm:hidden"
      loading={confirm.pending}
      onClick={async () => {
        try {
          await confirm.run();
          toast.success('Booking confirmed', appointment.customerName);
        } catch (e) {
          toast.error('Could not confirm', errorMessage(e));
        }
      }}
    >
      Confirm
    </Button>
  );
}

export function ReceptionOverview() {
  const { business } = useSession();
  const fmt = useFormat();
  const tz = business.timeZone;
  const today = todayKey(tz);
  const nowIso = new Date(useNow()).toISOString();
  const [openId, setOpenId] = useState<string | null>(null);
  const at = (k: string) => zonedToUtc(k, '00:00', tz).toISOString();

  const todays = useQuery(['appointments'], () => api.appointments.list({ from: at(today), to: at(addDays(today, 1)) }), [today]);
  const upcoming = useQuery(['appointments'], () => api.appointments.list({ from: at(addDays(today, 1)), to: at(addDays(today, 4)), status: ['PENDING', 'CONFIRMED'] }), [today]);
  const requests = useQuery(['cancellations'], () => api.cancellations.list('OPEN'), []);

  const live = (todays.data ?? []).filter((a) => a.status !== 'CANCELLED');
  const done = live.filter((a) => a.status === 'COMPLETED' || a.status === 'NO_SHOW').length;
  const confirmed = live.filter((a) => a.status === 'CONFIRMED' || a.status === 'COMPLETED').length;
  const pending = live.filter((a) => a.status === 'PENDING');
  const open = requests.data ?? [];

  const value = (n: number | undefined, ready: boolean) => (ready ? n : '–');

  return (
    <Page>
      <PageHeader title="Overview" description={fmt.date(nowIso)} actions={<NewBookingButton />} />

      <KpiGrid label="Today in numbers">
        <Kpi label="Today’s appointments" value={value(live.length, !!todays.data)} note={todays.data && `${done} done, ${live.length - done} still to come`} />
        <Kpi label="Confirmed bookings" value={value(confirmed, !!todays.data)} note="Including completed" />
        <Kpi label="Pending requests" value={value(pending.length, !!todays.data)} note="Waiting for confirmation" />
        <Kpi label="Cancellation requests" value={value(open.length, !!requests.data)} note={open[0] ? `Oldest from ${fmt.relative(open[open.length - 1]!.requestedAt)}` : 'None open'} />
      </KpiGrid>

      <div className="flex flex-wrap gap-6">
        <Card className="min-w-0 flex-[2_1_560px]">
          <CardHeader title="Today’s schedule" description="All staff, in time order" action={<ButtonLink to="/reception/appointments" variant="ghost" size="sm">All appointments</ButtonLink>} />
          <QueryView query={todays} isEmpty={() => live.length === 0} empty={<EmptyState title="Nothing booked today" />}>
            {() => (
              <DayList
                items={live.map((a) => ({ kind: 'appointment', start: a.start, appointment: a }))}
                nowIso={nowIso}
                detail={(a) => `${a.serviceName} with ${a.staffName.split(' ')[0]}${a.customerPhone ? ` · ${a.customerPhone}` : ''}`}
                onOpen={(a) => setOpenId(a.id)}
                action={(a) => (a.status === 'PENDING' ? <ConfirmButton appointment={a} /> : null)}
              />
            )}
          </QueryView>
        </Card>

        <Card className="min-w-0 flex-[1_1_340px]">
          <CardHeader title="Needs your attention" description={`${open.length + (pending.length ? 1 : 0)} open tasks`} />
          {open.length === 0 && pending.length === 0 ? (
            <EmptyState title="All caught up" body="New requests from calls will appear here." />
          ) : (
            <ul className="pb-2">
              {open.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start gap-3 border-t border-line px-6 py-3">
                  <span className="flex min-w-48 flex-1 flex-col gap-1">
                    <Badge tone="danger" className="self-start">Cancellation request</Badge>
                    <span className="font-semibold">
                      {r.appointment.customerName}: {r.appointment.serviceName}, {fmt.dateTime(r.appointment.start)}
                    </span>
                    <span className="type-body-sm text-ink-muted">
                      {r.reason ? `“${r.reason}” · ` : ''}
                      {fmt.relative(r.requestedAt)}
                    </span>
                  </span>
                  <ButtonLink to="/reception/cancellations" size="sm">
                    Review
                  </ButtonLink>
                </li>
              ))}
              {pending.length > 0 && (
                <li className="flex flex-col gap-1 border-t border-line px-6 py-3">
                  <Badge tone="warning" className="self-start">Pending</Badge>
                  <span className="font-semibold">
                    {pending.length} {pending.length === 1 ? 'booking' : 'bookings'} today still need confirming
                  </span>
                  <span className="type-body-sm text-ink-muted">{pending.map((a) => a.customerName).join(', ')}</span>
                </li>
              )}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap gap-6">
        <Card className="min-w-0 flex-[2_1_560px]">
          <CardHeader title="Upcoming appointments" description="Next 3 days" />
          <QueryView query={upcoming} isEmpty={(d) => d.length === 0} empty={<EmptyState title="Nothing booked for the next 3 days" />}>
            {(list) => <AppointmentList caption="Upcoming appointments" appointments={list.slice(0, 8)} onOpen={(a) => setOpenId(a.id)} columns={{ contact: true, staff: true }} />}
          </QueryView>
        </Card>
        <Card className="min-w-0 flex-[1_1_340px]">
          <CardHeader title="Recent customer requests" description="From calls and online, newest first" />
          <ActivityFeed />
        </Card>
      </div>

      <AppointmentDrawer appointmentId={openId} onClose={() => setOpenId(null)} />
    </Page>
  );
}
