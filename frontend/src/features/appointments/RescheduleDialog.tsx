import { useState } from 'react';
import { api, errorMessage, isApiError } from '../../api';
import { invalidate, newIdempotencyKey, useMutation, useQuery } from '../../lib/query';
import { dateKey, todayKey } from '../../lib/time';
import type { Appointment, Slot } from '../../types/domain';
import { useFormat } from '../auth/AuthProvider';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { Banner } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { SlotPicker } from '../booking/SlotPicker';

interface Props {
  appointment: Appointment;
  open: boolean;
  onClose: () => void;
  onDone: (a: Appointment) => void;
}

export function RescheduleDialog({ appointment, open, onClose, onDone }: Props) {
  const fmt = useFormat();
  const toast = useToast();
  const [date, setDate] = useState(() => {
    const current = dateKey(appointment.start, fmt.timeZone);
    const today = todayKey(fmt.timeZone);
    return current < today ? today : current;
  });
  const [staffId, setStaffId] = useState(appointment.staffId);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);

  const staff = useQuery(['staff'], () => api.staff.list(), []);
  const options = (staff.data ?? []).filter((s) => s.active && s.serviceIds.includes(appointment.serviceId));

  const save = useMutation(
    (s: Slot) => api.appointments.reschedule(appointment.id, { start: s.start, staffId: s.staffId, idempotencyKey: key }),
    { invalidates: ['appointments', 'availability', 'schedule'] },
  );

  const change = (fn: () => void) => {
    fn();
    setSlot(null);
    setConflict(null);
    setKey(newIdempotencyKey());
  };

  async function confirm() {
    if (!slot) return;
    try {
      const updated = await save.run(slot);
      if (!updated) return;
      toast.success('Appointment moved', `${updated.customerName}: ${fmt.dateTime(updated.start)} with ${updated.staffName}`);
      onDone(updated);
    } catch (e) {
      if (isApiError(e, 'SLOT_UNAVAILABLE')) {
        setConflict(errorMessage(e));
        setSlot(null);
        setKey(newIdempotencyKey());
        invalidate('availability');
      } else {
        toast.error('Could not move the appointment', errorMessage(e));
      }
    }
  }

  return (
    <Dialog
      open={open}
      onClose={save.pending ? () => {} : onClose}
      dismissible={!save.pending}
      size="lg"
      title="Reschedule appointment"
      description={`${appointment.customerName} · ${appointment.serviceName} · now ${fmt.dateTime(appointment.start)}`}
      footer={
        <>
          <Button onClick={onClose} disabled={save.pending}>
            Go back
          </Button>
          <Button variant="primary" onClick={confirm} disabled={!slot} loading={save.pending}>
            {slot ? `Move to ${fmt.time(slot.start)}` : 'Choose a time'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {conflict && <Banner tone="danger">{conflict}</Banner>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Date" type="date" value={date} min={todayKey(fmt.timeZone)} onChange={(e) => e.target.value && change(() => setDate(e.target.value))} />
          <SelectField label="Staff member" value={staffId} onChange={(e) => change(() => setStaffId(e.target.value))}>
            {options.length === 0 && <option value={appointment.staffId}>{appointment.staffName}</option>}
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        </div>
        <SlotPicker
          serviceId={appointment.serviceId}
          staffId={staffId}
          date={date}
          excludeAppointmentId={appointment.id}
          value={slot}
          onChange={(s) => {
            setSlot(s);
            setConflict(null);
          }}
        />
      </div>
    </Dialog>
  );
}
