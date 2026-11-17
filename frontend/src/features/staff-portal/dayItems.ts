import type { Appointment, ScheduleDay } from '../../types/domain';
import type { DayItem } from '../overview/DayList';

const MIN_GAP_MS = 15 * 60_000;

/** Appointments, breaks and free gaps for one working day, in time order. */
export function buildDayItems(day: ScheduleDay | undefined, appointments: Appointment[], untilLabel: (iso: string) => string): DayItem[] {
  const items: DayItem[] = [];
  const appts = appointments.filter((a) => a.status !== 'CANCELLED').sort((a, b) => a.start.localeCompare(b.start));
  const busy = [
    ...appts.map((a) => ({ start: a.start, end: a.end, item: { kind: 'appointment' as const, start: a.start, appointment: a } })),
    ...(day?.breaks ?? []).map((b) => ({ start: b.start, end: b.end, item: { kind: 'break' as const, start: b.start, end: b.end, label: `${b.label} until ${untilLabel(b.end)}` } })),
    ...(day?.unavailable ?? []).map((u) => ({ start: u.start, end: u.end, item: { kind: 'break' as const, start: u.start, end: u.end, label: `${u.label} until ${untilLabel(u.end)}` } })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  if (!day?.hours) return busy.map((b) => b.item);

  let cursor = day.hours.start;
  for (const b of busy) {
    if (new Date(b.start).getTime() - new Date(cursor).getTime() >= MIN_GAP_MS) {
      items.push({ kind: 'gap', start: cursor, end: b.start, label: `Free until ${untilLabel(b.start)}` });
    }
    items.push(b.item);
    if (b.end > cursor) cursor = b.end;
  }
  if (new Date(day.hours.end).getTime() - new Date(cursor).getTime() >= MIN_GAP_MS) {
    items.push({ kind: 'gap', start: cursor, end: day.hours.end, label: `Free until ${untilLabel(day.hours.end)}` });
  }
  return items;
}

export function workingMinutes(day: ScheduleDay | undefined): number {
  if (!day?.hours) return 0;
  const span = (s: string, e: string) => (new Date(e).getTime() - new Date(s).getTime()) / 60_000;
  return span(day.hours.start, day.hours.end) - day.breaks.reduce((t, b) => t + span(b.start, b.end), 0);
}
