import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../../api';
import type { AppointmentQuery } from '../../api';
import { useQuery } from '../../lib/query';
import { addDays, todayKey, zonedToUtc } from '../../lib/time';
import { useNow } from '../../lib/useNow';
import type { AppointmentStatus } from '../../types/domain';
import { useSession } from '../auth/AuthProvider';
import { Card } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Segmented } from '../../components/ui/Segmented';
import { SelectField, TextField } from '../../components/ui/Field';
import { EmptyState, QueryView } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { CalendarCheck } from '../../components/icons';
import { NewBookingButton } from '../booking/BookingDialog';
import { AppointmentDrawer } from './AppointmentDrawer';
import { AppointmentList } from './AppointmentList';
import { STATUS_LABEL } from './status';

export type AppointmentsMode = 'manage' | 'history' | 'mine';

type Range = 'today' | 'upcoming' | 'week' | 'past' | 'date';
type MineTab = 'today' | 'upcoming' | 'completed' | 'cancelled';

const MODE_TEXT: Record<AppointmentsMode, { title: string; description: string }> = {
  manage: { title: 'Appointments', description: 'Search, filter and manage every booking.' },
  history: { title: 'Appointment history', description: 'Completed, cancelled and no-show appointments.' },
  mine: { title: 'My appointments', description: 'Only appointments booked with you.' },
};

export function AppointmentsPage({ mode }: { mode: AppointmentsMode }) {
  const { user, business } = useSession();
  const tz = business.timeZone;
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const [range, setRange] = useState<Range>(mode === 'history' ? 'past' : 'upcoming');
  const [date, setDate] = useState(() => todayKey(tz));
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [staffId, setStaffId] = useState('');
  const [mineTab, setMineTab] = useState<MineTab>('today');
  const [openId, setOpenId] = useState<string | null>(null);

  const isStaff = user.role === 'STAFF';
  const staff = useQuery(['staff'], () => (isStaff ? Promise.resolve([]) : api.staff.list()), [isStaff]);

  const today = todayKey(tz);
  const dayStart = (k: string) => zonedToUtc(k, '00:00', tz).toISOString();
  const nowIso = new Date(useNow()).toISOString();

  const query: AppointmentQuery = { search: search || undefined, staffId: staffId || undefined };
  if (mode === 'mine') {
    if (mineTab === 'today') Object.assign(query, { from: dayStart(today), to: dayStart(addDays(today, 1)) });
    if (mineTab === 'upcoming') Object.assign(query, { from: nowIso, status: ['PENDING', 'CONFIRMED'] });
    if (mineTab === 'completed') Object.assign(query, { status: ['COMPLETED'], sort: 'desc' });
    if (mineTab === 'cancelled') Object.assign(query, { status: ['CANCELLED', 'NO_SHOW'], sort: 'desc' });
  } else {
    if (range === 'today') Object.assign(query, { from: dayStart(today), to: dayStart(addDays(today, 1)) });
    if (range === 'upcoming') Object.assign(query, { from: nowIso });
    if (range === 'week') Object.assign(query, { from: dayStart(today), to: dayStart(addDays(today, 7)) });
    if (range === 'past') Object.assign(query, { to: nowIso, sort: 'desc' });
    if (range === 'date') Object.assign(query, { from: dayStart(date), to: dayStart(addDays(date, 1)) });
    if (mode === 'history') query.status = status ? [status] : ['COMPLETED', 'CANCELLED', 'NO_SHOW'];
    else if (status) query.status = [status];
  }

  const list = useQuery(['appointments'], () => api.appointments.list(query), [JSON.stringify(query)]);

  const setSearch = (v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set('q', v);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  const statusOptions: AppointmentStatus[] =
    mode === 'history' ? ['COMPLETED', 'CANCELLED', 'NO_SHOW'] : ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  const hasFilters = !!(search || status || staffId);

  return (
    <Page>
      <PageHeader
        title={MODE_TEXT[mode].title}
        description={MODE_TEXT[mode].description}
        actions={mode === 'manage' ? <NewBookingButton /> : undefined}
      />

      <Card>
        <div className="flex flex-col gap-4 p-6">
          {mode === 'mine' ? (
            <Segmented<MineTab>
              label="Show"
              value={mineTab}
              onChange={setMineTab}
              className="w-full sm:w-auto sm:self-start"
              options={[
                { value: 'today', label: 'Today' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          ) : (
            mode === 'manage' && (
              <Segmented<Range>
                label="Date range"
                value={range}
                onChange={setRange}
                className="w-full overflow-x-auto sm:w-auto sm:self-start"
                options={[
                  { value: 'today', label: 'Today' },
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'week', label: 'Next 7 days' },
                  { value: 'past', label: 'Past' },
                  { value: 'date', label: 'Pick a date' },
                ]}
              />
            )
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TextField label="Search" type="search" placeholder={isStaff ? 'Customer or service' : 'Name, phone or service'} value={search} onChange={(e) => setSearch(e.target.value)} />
            {mode === 'manage' && range === 'date' && (
              <TextField label="Date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            )}
            {mode !== 'mine' && (
              <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus | '')}>
                <option value="">{mode === 'history' ? 'All past statuses' : 'All statuses'}</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </SelectField>
            )}
            {!isStaff && (
              <SelectField label="Staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">Everyone</option>
                {(staff.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
            )}
          </div>
        </div>

        <QueryView
          query={list}
          isEmpty={(d) => d.length === 0}
          empty={
            <EmptyState
              icon={<CalendarCheck size={20} strokeWidth={1.75} aria-hidden="true" />}
              title="No appointments found"
              body={hasFilters ? 'Try clearing the search or filters.' : 'Nothing is booked for this period.'}
              action={
                hasFilters ? (
                  <Button
                    onClick={() => {
                      setSearch('');
                      setStatus('');
                      setStaffId('');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {(rows) => (
            <>
              <AppointmentList
                caption={MODE_TEXT[mode].title}
                appointments={rows}
                onOpen={(a) => setOpenId(a.id)}
                columns={isStaff ? { duration: true } : { contact: true, staff: true, source: true }}
              />
              <p className="border-t border-line px-6 py-3 type-body-sm text-ink-muted" aria-live="polite">
                {rows.length} {rows.length === 1 ? 'appointment' : 'appointments'}
                {list.loading ? ' · updating' : ''}
              </p>
            </>
          )}
        </QueryView>
      </Card>

      <AppointmentDrawer appointmentId={openId} onClose={() => setOpenId(null)} />
    </Page>
  );
}
