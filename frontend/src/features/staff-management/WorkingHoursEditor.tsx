import type { WeeklyHours } from '../../types/domain';
import { controlClass } from '../../components/ui/Field';

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  value: WeeklyHours;
  onChange: (value: WeeklyHours) => void;
  error?: string;
}

export function WorkingHoursEditor({ value, onChange, error }: Props) {
  const set = (day: number, next: WeeklyHours[number]) => onChange(value.map((d, i) => (i === day ? next : d)));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 type-label">Working hours</legend>
      {ORDER.map((day) => {
        const h = value[day] ?? null;
        return (
          <div key={day} className="grid grid-cols-[minmax(110px,1fr)_auto] items-center gap-3 sm:grid-cols-[140px_auto_1fr]">
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                className="size-5 accent-[var(--brand-magenta)]"
                checked={!!h}
                onChange={(e) => set(day, e.target.checked ? { open: '10:00', close: '19:00' } : null)}
              />
              {WEEKDAY_NAMES[day]}
            </label>
            {h ? (
              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <input
                  type="time"
                  aria-label={`${WEEKDAY_NAMES[day]} start`}
                  className={`${controlClass} min-w-0 flex-1 sm:w-32 sm:flex-none`}
                  value={h.open}
                  onChange={(e) => set(day, { ...h, open: e.target.value })}
                />
                <span className="text-ink-muted">to</span>
                <input
                  type="time"
                  aria-label={`${WEEKDAY_NAMES[day]} end`}
                  className={`${controlClass} min-w-0 flex-1 sm:w-32 sm:flex-none`}
                  value={h.close}
                  onChange={(e) => set(day, { ...h, close: e.target.value })}
                />
              </div>
            ) : (
              <span className="text-ink-muted">Closed</span>
            )}
          </div>
        );
      })}
      {error && <p className="type-caption font-semibold text-danger-fg">{error}</p>}
    </fieldset>
  );
}

export function validateHours(hours: WeeklyHours): string | undefined {
  for (const h of hours) if (h && h.open >= h.close) return 'Each day must end after it starts.';
  return undefined;
}

export function hoursSummary(hours: WeeklyHours, formatTime: (t: string) => string): string[] {
  return ORDER.map((d) => {
    const h = hours[d];
    return `${WEEKDAY_NAMES[d]!.slice(0, 3)}: ${h ? `${formatTime(h.open)} to ${formatTime(h.close)}` : 'Closed'}`;
  });
}

export function formatClock(t: string) {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
