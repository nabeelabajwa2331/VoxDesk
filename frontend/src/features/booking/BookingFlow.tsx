import { useState, type ReactNode } from 'react';
import { api, errorMessage, isApiError } from '../../api';
import { invalidate, newIdempotencyKey, useMutation, useQuery } from '../../lib/query';
import { todayKey } from '../../lib/time';
import { cn } from '../../lib/cn';
import type { Appointment, Customer, Service, Slot } from '../../types/domain';
import { useFormat } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Banner, ErrorState, Loading } from '../../components/ui/States';
import { Check } from '../../components/icons';
import { CustomerPicker } from './CustomerPicker';
import { SlotPicker } from './SlotPicker';

type Step = 'customer' | 'service' | 'staff' | 'time' | 'review';
const STEPS: { id: Step; label: string }[] = [
  { id: 'customer', label: 'Customer' },
  { id: 'service', label: 'Service' },
  { id: 'staff', label: 'Staff' },
  { id: 'time', label: 'Date and time' },
  { id: 'review', label: 'Review' },
];

const ANY = 'any';

interface Props {
  onBooked?: (a: Appointment) => void;
  onViewAppointment?: (a: Appointment) => void;
}

export function BookingFlow({ onBooked, onViewAppointment }: Props) {
  const fmt = useFormat();
  const [step, setStep] = useState<Step>('customer');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [staffChoice, setStaffChoice] = useState<string>(ANY);
  const [date, setDate] = useState(() => todayKey(fmt.timeZone));
  const [slot, setSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [conflict, setConflict] = useState<string | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);

  const services = useQuery(['services'], () => api.services.list(), []);
  const staff = useQuery(['staff'], () => api.staff.list(), []);

  const create = useMutation(
    () => api.appointments.create({ customerId: customer!.id, serviceId: service!.id, staffId: slot!.staffId, start: slot!.start, notes, idempotencyKey: key }),
    { invalidates: ['appointments', 'availability', 'customers', 'activity', 'schedule'] },
  );

  const resetSlot = () => {
    setSlot(null);
    setKey(newIdempotencyKey());
  };

  const index = STEPS.findIndex((s) => s.id === step);
  const canOpen = (s: Step) => {
    const i = STEPS.findIndex((x) => x.id === s);
    const done = [!!customer, !!service, true, !!slot, false];
    return done.slice(0, i).every(Boolean);
  };

  async function confirm() {
    setConflict(null);
    try {
      const a = await create.run();
      if (!a) return;
      setBooked(a);
      onBooked?.(a);
    } catch (e) {
      if (isApiError(e, 'SLOT_UNAVAILABLE')) {
        setConflict(errorMessage(e));
        resetSlot();
        invalidate('availability');
        setStep('time');
      }
    }
  }

  function startOver() {
    setBooked(null);
    setCustomer(null);
    setService(null);
    setStaffChoice(ANY);
    setNotes('');
    resetSlot();
    setStep('customer');
  }

  if (booked) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border border-line bg-raised p-6" role="status">
        <span className="flex size-12 items-center justify-center rounded-full bg-success-bg text-success-fg">
          <Check size={24} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div>
          <p className="type-heading-sm">
            Booked: {booked.serviceName} with {booked.staffName.split(' ')[0]}
          </p>
          <p className="mt-1 text-ink-muted">
            {booked.customerName} · {fmt.date(booked.start)} · {fmt.timeRange(booked.start, booked.end)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={startOver}>
            Book another
          </Button>
          {onViewAppointment && <Button onClick={() => onViewAppointment(booked)}>View appointment</Button>}
        </div>
      </div>
    );
  }

  if ((services.error && !services.data) || (staff.error && !staff.data)) {
    return <ErrorState error={services.error ?? staff.error} onRetry={() => { services.reload(); staff.reload(); }} />;
  }
  if (!services.data || !staff.data) return <Loading rows={5} />;

  const activeServices = services.data.filter((s) => s.active);
  const staffForService = staff.data.filter((s) => s.active && service && s.serviceIds.includes(service.id));
  const staffId = staffChoice === ANY ? undefined : staffChoice;

  const summary: Record<Step, ReactNode> = {
    customer: customer ? `${customer.name} · ${customer.phone ?? ''}` : null,
    service: service ? `${service.name} · ${fmt.duration(service.durationMin)} · ${fmt.money(service.price)}` : null,
    staff: service ? (staffId ? staff.data.find((s) => s.id === staffId)?.name : 'Any available') : null,
    time: slot ? `${fmt.date(slot.start)} · ${fmt.time(slot.start)} with ${slot.staffName}` : null,
    review: null,
  };

  return (
    <ol className="flex flex-col gap-3">
      {STEPS.map((s, i) => {
        const open = s.id === step;
        const reachable = canOpen(s.id);
        return (
          <li key={s.id} className={cn('rounded-lg border bg-raised', open ? 'border-line-strong' : 'border-line')}>
            <button
              type="button"
              disabled={!reachable || open}
              onClick={() => setStep(s.id)}
              aria-expanded={open}
              className="flex min-h-14 w-full items-center gap-4 px-5 py-3 text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full type-label',
                  i < index && summary[s.id] ? 'bg-success-bg text-success-fg' : open ? 'bg-brand text-on-brand' : 'bg-surface text-ink-muted ring-1 ring-line',
                )}
              >
                {i < index && summary[s.id] ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : i + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">{s.label}</span>
                {!open && summary[s.id] && <span className="truncate type-body-sm text-ink-muted">{summary[s.id]}</span>}
              </span>
            </button>

            {open && (
              <div className="flex flex-col gap-4 border-t border-line px-5 pt-4 pb-5">
                {s.id === 'customer' && (
                  <>
                    <CustomerPicker value={customer} onChange={(c) => { setCustomer(c); setStep('service'); }} />
                  </>
                )}

                {s.id === 'service' && (
                  <div role="radiogroup" aria-label="Service" className="grid gap-2 sm:grid-cols-2">
                    {activeServices.map((svc) => {
                      const selected = service?.id === svc.id;
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => {
                            setService(svc);
                            setStaffChoice(ANY);
                            resetSlot();
                            setStep('staff');
                          }}
                          className={cn('flex min-h-14 flex-col rounded-md border px-4 py-3 text-left', selected ? 'border-brand bg-brand text-on-brand' : 'border-line-strong hover:bg-surface')}
                        >
                          <span className="font-semibold">{svc.name}</span>
                          <span className={cn('type-body-sm', selected ? '' : 'text-ink-muted')}>
                            {fmt.duration(svc.durationMin)} · {fmt.money(svc.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {s.id === 'staff' && service && (
                  <>
                    <div role="radiogroup" aria-label="Staff member" className="grid gap-2 sm:grid-cols-2">
                      {[{ id: ANY, name: 'Any available', title: 'First free time with anyone who offers this' }, ...staffForService].map((m) => {
                        const selected = staffChoice === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => {
                              setStaffChoice(m.id);
                              resetSlot();
                            }}
                            className={cn('flex min-h-14 flex-col rounded-md border px-4 py-3 text-left', selected ? 'border-brand bg-brand text-on-brand' : 'border-line-strong hover:bg-surface')}
                          >
                            <span className="font-semibold">{m.name}</span>
                            <span className={cn('type-body-sm', selected ? '' : 'text-ink-muted')}>{m.title}</span>
                          </button>
                        );
                      })}
                    </div>
                    <Button variant="primary" className="self-start" onClick={() => setStep('time')}>
                      Continue
                    </Button>
                  </>
                )}

                {s.id === 'time' && service && (
                  <>
                    {conflict && <Banner tone="danger">{conflict}</Banner>}
                    <TextField
                      className="max-w-xs"
                      label="Date"
                      type="date"
                      value={date}
                      min={todayKey(fmt.timeZone)}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        setDate(e.target.value);
                        resetSlot();
                      }}
                    />
                    <SlotPicker
                      serviceId={service.id}
                      staffId={staffId}
                      date={date}
                      value={slot}
                      onChange={(sl) => {
                        setSlot(sl);
                        setKey(newIdempotencyKey());
                        setConflict(null);
                      }}
                    />
                    <Button variant="primary" className="self-start" disabled={!slot} onClick={() => setStep('review')}>
                      Continue
                    </Button>
                  </>
                )}

                {s.id === 'review' && customer && service && slot && (
                  <>
                    <dl className="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-[160px_1fr]">
                      <dt className="type-label text-ink-muted">Customer</dt>
                      <dd className="m-0">{customer.name} · {customer.phone}</dd>
                      <dt className="type-label text-ink-muted">Service</dt>
                      <dd className="m-0">{service.name} · {fmt.money(service.price)}</dd>
                      <dt className="type-label text-ink-muted">Staff</dt>
                      <dd className="m-0">{slot.staffName}</dd>
                      <dt className="type-label text-ink-muted">When</dt>
                      <dd className="m-0">{fmt.date(slot.start)} · {fmt.timeRange(slot.start, slot.end)}</dd>
                    </dl>
                    <TextAreaField label="Booking note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                    {create.error !== undefined && !isApiError(create.error, 'SLOT_UNAVAILABLE') && (
                      <Banner tone="danger">{errorMessage(create.error)} Nothing was booked.</Banner>
                    )}
                    <p className="type-body-sm text-ink-muted">The booking is only made once the system confirms the time is still free.</p>
                    <Button variant="primary" className="self-start" loading={create.pending} onClick={confirm}>
                      {create.pending ? 'Booking…' : 'Confirm booking'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
