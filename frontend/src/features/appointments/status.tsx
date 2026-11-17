import type { Appointment, AppointmentStatus, BookingSource } from '../../types/domain';
import { AiPill, Badge, type BadgeTone } from '../../components/ui/Badge';

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

const STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
};

export const SOURCE_LABEL: Record<BookingSource, string> = {
  AI_CALL: 'AI receptionist',
  RECEPTION: 'Reception',
  ONLINE: 'Online',
  OWNER: 'Owner',
};

export const isActive = (a: Pick<Appointment, 'status'>) => a.status === 'PENDING' || a.status === 'CONFIRMED';

export function StatusBadge({ appointment }: { appointment: Pick<Appointment, 'status' | 'cancelRequested'> }) {
  if (appointment.cancelRequested && isActive(appointment)) return <Badge tone="danger">Cancel requested</Badge>;
  return <Badge tone={STATUS_TONE[appointment.status]}>{STATUS_LABEL[appointment.status]}</Badge>;
}

export function SourceLabel({ source }: { source: BookingSource }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {source === 'AI_CALL' && <AiPill />}
      {SOURCE_LABEL[source]}
    </span>
  );
}

export function durationMinutes(a: Pick<Appointment, 'start' | 'end'>) {
  return Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 60_000);
}
