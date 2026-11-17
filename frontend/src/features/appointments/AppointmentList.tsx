import type { Appointment } from '../../types/domain';
import { useFormat } from '../auth/AuthProvider';
import { StatusBadge, SourceLabel, durationMinutes } from './status';

export interface AppointmentColumns {
  contact?: boolean;
  staff?: boolean;
  source?: boolean;
  duration?: boolean;
  price?: boolean;
}

interface Props {
  appointments: Appointment[];
  columns?: AppointmentColumns;
  onOpen: (a: Appointment) => void;
  caption: string;
}

/** Table on wide screens, stacked cards on phones. Every row opens the details drawer. */
export function AppointmentList({ appointments, columns = {}, onOpen, caption }: Props) {
  const fmt = useFormat();
  const th = 'px-3 py-3 text-left type-label text-ink-muted whitespace-nowrap first:pl-6 last:pr-6';
  const td = 'px-3 py-3 whitespace-nowrap first:pl-6 last:pr-6';

  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-t border-line">
              <th scope="col" className={th}>Customer</th>
              <th scope="col" className={th}>Date and time</th>
              <th scope="col" className={th}>Service</th>
              {columns.staff && <th scope="col" className={th}>Staff</th>}
              {columns.duration && <th scope="col" className={`${th} text-right`}>Duration</th>}
              {columns.source && <th scope="col" className={th}>Booked by</th>}
              {columns.price && <th scope="col" className={`${th} text-right`}>Price</th>}
              <th scope="col" className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="cursor-pointer border-t border-line hover:bg-surface" onClick={() => onOpen(a)}>
                <td className={td}>
                  <button type="button" className="text-left font-semibold hover:text-brand-strong" onClick={(e) => { e.stopPropagation(); onOpen(a); }}>
                    {a.customerName}
                  </button>
                  {columns.contact && a.customerPhone && <span className="block type-body-sm text-ink-muted">{a.customerPhone}</span>}
                </td>
                <td className={td}>{fmt.dateTime(a.start)}</td>
                <td className={td}>{a.serviceName}</td>
                {columns.staff && <td className={td}>{a.staffName}</td>}
                {columns.duration && <td className={`${td} text-right`}>{fmt.duration(durationMinutes(a))}</td>}
                {columns.source && <td className={td}><SourceLabel source={a.source} /></td>}
                {columns.price && <td className={`${td} text-right`}>{a.price !== undefined ? fmt.money(a.price) : ''}</td>}
                <td className={td}><StatusBadge appointment={a} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="sm:hidden" aria-label={caption}>
        {appointments.map((a) => (
          <li key={a.id} className="border-t border-line">
            <button type="button" onClick={() => onOpen(a)} className="flex w-full flex-col gap-1 px-4 py-4 text-left">
              <span className="flex items-start justify-between gap-3">
                <span className="font-semibold">{a.customerName}</span>
                <StatusBadge appointment={a} />
              </span>
              <span className="type-body-sm text-ink-muted">
                {fmt.dateTime(a.start)} · {a.serviceName}
                {columns.staff ? ` with ${a.staffName}` : ''}
              </span>
              {columns.contact && a.customerPhone && <span className="type-body-sm text-ink-muted">{a.customerPhone}</span>}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
