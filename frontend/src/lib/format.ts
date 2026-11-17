import type { Business, DateFormat } from '../types/domain';
import { dateKey, diffDays, todayKey } from './time';

export interface Formatter {
  timeZone: string;
  time(iso: string): string;
  timeRange(start: string, end: string): string;
  date(iso: string): string;
  dateShort(iso: string): string;
  dateTime(iso: string): string;
  dayLabel(key: string): string;
  monthLabel(key: string): string;
  money(amount: number): string;
  relative(iso: string): string;
  duration(minutes: number): string;
  percent(ratio: number): string;
}

function keyToNoonUtc(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

export function createFormatter(
  business: Pick<Business, 'timeZone' | 'currency' | 'locale' | 'dateFormat'>,
): Formatter {
  const { timeZone, currency, locale } = business;
  const dateFormat: DateFormat = business.dateFormat;

  const timeF = new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit', hour12: true });
  const longF = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const shortF = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short' });
  const dayF = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
  const monthF = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  const moneyF = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  });
  const pctF = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });

  const clean = (s: string) => s.replace(/,(?=\s\d)/, '').replace(/\u202f/g, ' ');

  const date = (iso: string) => {
    const key = dateKey(iso, timeZone);
    if (dateFormat === 'iso') return key;
    if (dateFormat === 'dmy') {
      const [y, m, d] = key.split('-');
      return `${d}/${m}/${y}`;
    }
    return clean(longF.format(new Date(iso)));
  };

  return {
    timeZone,
    time: (iso) => timeF.format(new Date(iso)).replace(/\u202f/g, ' ').toUpperCase(),
    timeRange(start, end) {
      return `${this.time(start)} to ${this.time(end)}`;
    },
    date,
    dateShort: (iso) => clean(shortF.format(new Date(iso))),
    dateTime(iso) {
      return `${this.dateShort(iso)}, ${this.time(iso)}`;
    },
    dayLabel(key) {
      const today = todayKey(timeZone);
      const diff = diffDays(today, key);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      if (diff === -1) return 'Yesterday';
      return clean(dayF.format(keyToNoonUtc(key)));
    },
    monthLabel: (key) => monthF.format(keyToNoonUtc(key)),
    money: (amount) => moneyF.format(amount).replace(/\u00a0/g, ' '),
    relative(iso) {
      const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins} min ago`;
      const hours = Math.round(mins / 60);
      if (hours < 24) return `${hours} h ago`;
      return this.dateShort(iso);
    },
    duration(minutes) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (!h) return `${m} min`;
      return m ? `${h} h ${m} min` : `${h} h`;
    },
    percent: (ratio) => pctF.format(ratio),
  };
}
