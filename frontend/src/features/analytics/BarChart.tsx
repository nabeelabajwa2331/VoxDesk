import { cn } from '../../lib/cn';

export interface BarSeries {
  key: string;
  label: string;
  className: string;
}

export interface BarDatum {
  label: string;
  values: Record<string, number>;
  highlight?: boolean;
}

interface Props {
  series: BarSeries[];
  data: BarDatum[];
  summary: string;
  formatValue?: (n: number) => string;
  height?: number;
}

function niceMax(n: number) {
  if (n <= 0) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) if (n <= s * pow) return s * pow;
  return 10 * pow;
}

/** Stacked bar chart drawn with plain elements, with a hidden table for screen readers. */
export function BarChart({ series, data, summary, formatValue = (n) => String(n), height = 220 }: Props) {
  const totals = data.map((d) => series.reduce((t, s) => t + (d.values[s.key] ?? 0), 0));
  const max = niceMax(Math.max(0, ...totals));
  const showEvery = data.length > 16 ? Math.ceil(data.length / 10) : 1;

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 type-body-sm text-ink-muted">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <i className={cn('size-3 rounded-[3px]', s.className)} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>
      <div className="flex gap-3" aria-hidden="true">
        <div className="flex w-14 shrink-0 flex-col justify-between text-right type-caption text-ink-muted" style={{ height }}>
          <span>{formatValue(max)}</span>
          <span>{formatValue(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative flex items-end gap-1 border-y border-line sm:gap-2" style={{ height }}>
            <div className="absolute inset-x-0 top-1/2 border-t border-line" />
            {data.map((d, i) => (
              <div key={i} className="relative flex h-full min-w-0 flex-1 flex-col justify-end gap-0.5" title={`${d.label}: ${series.map((s) => `${s.label} ${formatValue(d.values[s.key] ?? 0)}`).join(', ')}`}>
                {[...series].reverse().map((s, si) => {
                  const v = d.values[s.key] ?? 0;
                  if (!v) return null;
                  return <div key={s.key} className={cn(s.className, si === 0 && 'rounded-t-[4px]')} style={{ height: `${(v / max) * 100}%` }} />;
                })}
              </div>
            ))}
          </div>
          <div className="flex gap-1 type-caption text-ink-muted sm:gap-2">
            {data.map((d, i) => (
              <span key={i} className={cn('min-w-0 flex-1 truncate text-center', d.highlight && 'font-semibold text-ink')}>
                {i % showEvery === 0 || d.highlight ? d.label : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Day</th>
            {series.map((s) => (
              <th key={s.key} scope="col">{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.label}</th>
              {series.map((s) => (
                <td key={s.key}>{formatValue(d.values[s.key] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <span className="flex items-center gap-3">
      <span role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label} className="h-2 flex-1 overflow-hidden rounded-full bg-surface ring-1 ring-inset ring-line">
        <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-10 text-right type-body-sm">{pct}%</span>
    </span>
  );
}
