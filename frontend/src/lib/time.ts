export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

const partFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let f = partFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
    });
    partFormatters.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function zonedParts(value: string | Date | number, timeZone: string): ZonedParts {
  const date = value instanceof Date ? value : new Date(value);
  const out: Record<string, string> = {};
  for (const p of partsFormatter(timeZone).formatToParts(date)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    weekday: WEEKDAYS.indexOf(out.weekday ?? 'Sun'),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(value: string | Date | number, timeZone: string): string {
  const p = zonedParts(value, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function todayKey(timeZone: string): string {
  return dateKey(new Date(), timeZone);
}

function parseKey(key: string) {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number);
  return { y, m, d };
}

export function addDays(key: string, days: number): string {
  const { y, m, d } = parseKey(key);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function addMonths(key: string, months: number): string {
  const { y, m } = parseKey(key);
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-01`;
}

export function weekdayOf(key: string): number {
  const { y, m, d } = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Monday-based week start. */
export function startOfWeek(key: string): string {
  const wd = weekdayOf(key);
  return addDays(key, wd === 0 ? -6 : 1 - wd);
}

export function startOfMonth(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

export function daysInMonth(key: string): number {
  const { y, m } = parseKey(key);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function diffDays(a: string, b: string): number {
  const pa = parseKey(a);
  const pb = parseKey(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

/** Converts a wall-clock date and time in `timeZone` to a UTC Date. */
export function zonedToUtc(key: string, time: string, timeZone: string): Date {
  const { y, m, d } = parseKey(key);
  const [hh = 0, mm = 0] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(guess, timeZone);
    const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += wall - seen;
  }
  return new Date(guess);
}

export function minutesOfDay(value: string | Date, timeZone: string): number {
  const p = zonedParts(value, timeZone);
  return p.hour * 60 + p.minute;
}

export function timeToMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function overlaps(a: { start: string; end: string }, b: { start: string; end: string }): boolean {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);
}
