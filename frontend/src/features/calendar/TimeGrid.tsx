import { minutesOfDay } from '../../lib/time';
import { cn } from '../../lib/cn';
import { useFormat } from '../auth/AuthProvider';

export type EventTone = 'confirmed' | 'pending' | 'done';

export interface GridEvent {
  id: string;
  start: string;
  end: string;
  title: string;
  subtitle?: string;
  tone: EventTone;
  onClick?: () => void;
}

export interface GridBlock {
  start: string;
  end: string;
  label: string;
  kind: 'break' | 'unavailable';
}

export interface GridColumn {
  key: string;
  label: string;
  sublabel?: string;
  highlight?: boolean;
  closedLabel?: string;
  /** Working window for this column; time outside it is shaded. */
  open?: { start: string; end: string };
  events: GridEvent[];
  blocks: GridBlock[];
}

interface Props {
  columns: GridColumn[];
  startMin: number;
  endMin: number;
  nowIso?: string;
  nowColumns?: string[];
}

const PX_PER_MIN = 1.2;

const toneClass: Record<EventTone, string> = {
  confirmed: 'bg-brand text-on-brand',
  pending: 'bg-warning-bg text-warning-fg ring-1 ring-inset ring-warning-fg/40',
  done: 'bg-surface text-ink-muted ring-1 ring-inset ring-line',
};

export function TimeGrid({ columns, startMin, endMin, nowIso, nowColumns = [] }: Props) {
  const fmt = useFormat();
  const tz = fmt.timeZone;
  const height = (endMin - startMin) * PX_PER_MIN;
  const hours: number[] = [];
  for (let m = Math.ceil(startMin / 60) * 60; m <= endMin; m += 60) hours.push(m);

  const top = (iso: string) => Math.max(0, (minutesOfDay(iso, tz) - startMin) * PX_PER_MIN);
  const span = (start: string, end: string) => {
    const s = Math.max(minutesOfDay(start, tz), startMin);
    const e = Math.min(minutesOfDay(end, tz) || 24 * 60, endMin);
    return Math.max(18, (e - s) * PX_PER_MIN);
  };
  const hourLabel = (m: number) => {
    const h = Math.floor(m / 60);
    return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit" style={{ minWidth: 64 + columns.length * 150 }}>
        <div className="sticky top-0 z-10 flex border-b border-line bg-raised">
          <div className="w-16 shrink-0" />
          {columns.map((c) => (
            <div key={c.key} className="min-w-[150px] flex-1 border-l border-line px-3 py-3">
              <p className={cn('font-semibold', c.highlight && 'text-brand-strong')}>{c.label}</p>
              {c.sublabel && <p className="type-body-sm text-ink-muted">{c.sublabel}</p>}
            </div>
          ))}
        </div>
        <div className="flex">
          <div className="relative w-16 shrink-0" style={{ height }} aria-hidden="true">
            {hours.map((m) => (
              <span key={m} className="absolute right-2 -translate-y-1/2 type-caption text-ink-muted" style={{ top: (m - startMin) * PX_PER_MIN }}>
                {hourLabel(m)}
              </span>
            ))}
          </div>
          {columns.map((c) => {
            const openTop = c.open ? top(c.open.start) : 0;
            const openBottom = c.open ? top(c.open.end) : height;
            return (
              <div key={c.key} className="relative min-w-[150px] flex-1 border-l border-line" style={{ height }}>
                {hours.map((m) => (
                  <div key={m} className="absolute inset-x-0 border-t border-line" style={{ top: (m - startMin) * PX_PER_MIN }} aria-hidden="true" />
                ))}
                {c.closedLabel ? (
                  <div className="absolute inset-0 flex items-start justify-center bg-surface pt-6 type-body-sm text-ink-muted">{c.closedLabel}</div>
                ) : (
                  c.open && (
                    <>
                      {openTop > 0 && <div className="absolute inset-x-0 top-0 bg-surface" style={{ height: openTop }} aria-hidden="true" />}
                      {openBottom < height && <div className="absolute inset-x-0 bottom-0 bg-surface" style={{ top: openBottom }} aria-hidden="true" />}
                    </>
                  )
                )}
                {c.blocks.map((b, i) => (
                  <div
                    key={`b${i}`}
                    className={cn(
                      'absolute inset-x-1 flex items-start rounded-md border border-dashed px-2 py-1 type-caption',
                      b.kind === 'break' ? 'border-line-strong bg-surface text-ink-muted' : 'border-danger-fg/50 bg-danger-bg text-danger-fg',
                    )}
                    style={{ top: top(b.start), height: span(b.start, b.end) }}
                  >
                    {b.label}
                  </div>
                ))}
                {c.events.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={e.onClick}
                    disabled={!e.onClick}
                    className={cn('absolute inset-x-1 overflow-hidden rounded-lg px-2 py-1 text-left disabled:cursor-default', toneClass[e.tone])}
                    style={{ top: top(e.start) + 1, height: span(e.start, e.end) - 2 }}
                    aria-label={`${fmt.time(e.start)} ${e.title}${e.subtitle ? `, ${e.subtitle}` : ''}`}
                  >
                    <span className="block truncate type-caption font-semibold">
                      {fmt.time(e.start)} {e.title}
                    </span>
                    {e.subtitle && <span className="block truncate type-caption">{e.subtitle}</span>}
                  </button>
                ))}
                {nowIso && nowColumns.includes(c.key) && minutesOfDay(nowIso, tz) >= startMin && minutesOfDay(nowIso, tz) <= endMin && (
                  <div className="pointer-events-none absolute inset-x-0 z-[1] h-0.5 bg-brand" style={{ top: top(nowIso) }} aria-label={`Now, ${fmt.time(nowIso)}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function toneFor(status: string): EventTone {
  if (status === 'PENDING') return 'pending';
  if (status === 'CONFIRMED') return 'confirmed';
  return 'done';
}
