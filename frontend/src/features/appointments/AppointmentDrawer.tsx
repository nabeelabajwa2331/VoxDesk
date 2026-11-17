import { useState, type ReactNode } from 'react';
import { api, errorMessage } from '../../api';
import { useMutation, useQuery } from '../../lib/query';
import { useNow } from '../../lib/useNow';
import type { Appointment } from '../../types/domain';
import { useFormat, useSession } from '../auth/AuthProvider';
import { Dialog, ConfirmDialog } from '../../components/ui/Dialog';
import { Button, buttonClass } from '../../components/ui/Button';
import { TextAreaField } from '../../components/ui/Field';
import { ErrorState, Loading } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { Phone } from '../../components/icons';
import { RescheduleDialog } from './RescheduleDialog';
import { SourceLabel, StatusBadge, durationMinutes, isActive } from './status';

interface Props {
  appointmentId: string | null;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-t border-line py-3 first:border-t-0">
      <dt className="type-label text-ink-muted">{label}</dt>
      <dd className="m-0 min-w-0 break-words">{children}</dd>
    </div>
  );
}

export function AppointmentDrawer({ appointmentId, onClose }: Props) {
  return (
    <Dialog open={appointmentId !== null} onClose={onClose} variant="drawer" title="Appointment">
      {appointmentId && <AppointmentDetails key={appointmentId} id={appointmentId} />}
    </Dialog>
  );
}

function AppointmentDetails({ id }: { id: string }) {
  const { user } = useSession();
  const fmt = useFormat();
  const toast = useToast();
  const q = useQuery(['appointments'], () => api.appointments.get(id), [id]);
  const [dialog, setDialog] = useState<'reschedule' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const now = useNow();

  const canManage = user.role === 'OWNER' || user.role === 'RECEPTIONIST';
  const tags = { invalidates: ['appointments', 'availability', 'cancellations', 'schedule', 'activity'] };
  const status = useMutation((s: 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW') => api.appointments.setStatus(id, s), tags);
  const cancel = useMutation(() => api.appointments.cancel(id, reason), tags);

  if (q.error && !q.data) return <ErrorState error={q.error} onRetry={q.reload} />;
  if (!q.data) return <Loading rows={6} />;
  const a: Appointment = q.data;
  const started = new Date(a.start).getTime() <= now;

  async function setStatus(s: 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW', done: string) {
    try {
      await status.run(s);
      toast.success(done);
    } catch (e) {
      toast.error('Could not update the appointment', errorMessage(e));
    }
  }

  async function confirmCancel() {
    try {
      await cancel.run();
      toast.success('Appointment cancelled', `${a.customerName}, ${fmt.dateTime(a.start)}`);
      setDialog(null);
    } catch (e) {
      toast.error('Could not cancel', errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <p className="type-heading-md">{a.customerName}</p>
          <StatusBadge appointment={a} />
        </div>
        <p className="text-ink-muted">
          {a.serviceName} with {a.staffName}
        </p>
      </div>

      <dl className="m-0">
        <Row label="When">
          {fmt.date(a.start)}
          <span className="block text-ink-muted">
            {fmt.timeRange(a.start, a.end)} · {fmt.duration(durationMinutes(a))}
          </span>
        </Row>
        {a.customerPhone && (
          <Row label="Phone">
            <a href={`tel:${a.customerPhone.replace(/\s/g, '')}`}>{a.customerPhone}</a>
          </Row>
        )}
        {a.price !== undefined && <Row label="Price">{fmt.money(a.price)}</Row>}
        <Row label="Booked by">
          <SourceLabel source={a.source} />
          <span className="block type-body-sm text-ink-muted">{fmt.dateTime(a.createdAt)}</span>
        </Row>
        {a.notes && <Row label="Booking note">{a.notes}</Row>}
        {a.customerNotes && <Row label="Customer note">{a.customerNotes}</Row>}
      </dl>

      {canManage && isActive(a) && (
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <div className="flex flex-wrap gap-3">
            {a.status === 'PENDING' && (
              <Button variant="primary" loading={status.pending} onClick={() => setStatus('CONFIRMED', 'Booking confirmed')}>
                Confirm booking
              </Button>
            )}
            {!started && <Button onClick={() => setDialog('reschedule')}>Reschedule</Button>}
            {started && (
              <>
                <Button loading={status.pending} onClick={() => setStatus('COMPLETED', 'Marked as completed')}>
                  Mark completed
                </Button>
                <Button onClick={() => setStatus('NO_SHOW', 'Marked as no-show')} disabled={status.pending}>
                  No-show
                </Button>
              </>
            )}
            {a.customerPhone && (
              <a href={`tel:${a.customerPhone.replace(/\s/g, '')}`} className={buttonClass('outline', 'md', 'no-underline')}>
                <Phone size={20} strokeWidth={1.75} aria-hidden="true" />
                Call
              </a>
            )}
          </div>
          <Button variant="danger" className="self-start" onClick={() => setDialog('cancel')}>
            Cancel appointment
          </Button>
        </div>
      )}

      {!canManage && (
        <p className="border-t border-line pt-5 type-body-sm text-ink-muted">
          Changes to bookings are made by reception or the owner.
        </p>
      )}

      {dialog === 'reschedule' && (
        <RescheduleDialog appointment={a} open onClose={() => setDialog(null)} onDone={() => setDialog(null)} />
      )}
      <ConfirmDialog
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        onConfirm={confirmCancel}
        pending={cancel.pending}
        title="Cancel this appointment?"
        body={`${a.customerName} · ${a.serviceName} · ${fmt.dateTime(a.start)}. The time becomes free for other bookings. This cannot be undone.`}
        confirmLabel="Cancel appointment"
        cancelLabel="Keep appointment"
      >
        <TextAreaField label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      </ConfirmDialog>
      <div className="sr-only" aria-live="polite">
        {status.pending || cancel.pending ? 'Saving' : ''}
      </div>
    </div>
  );
}
