import { NavLink } from 'react-router';
import { api } from '../../api';
import { useQuery } from '../../lib/query';
import { NAVIGATION, ROLE_LABEL, type NavItem } from '../../config/navigation';
import { useFormat, useSession } from '../../features/auth/AuthProvider';
import { todayKey } from '../../lib/time';
import { cn } from '../../lib/cn';
import { Wordmark } from '../ui/Logo';
import { CountPill } from '../ui/Badge';

export function useNavCounters() {
  const { user } = useSession();
  const enabled = user.role === 'RECEPTIONIST' || user.role === 'OWNER';
  const q = useQuery(['cancellations'], () => (enabled ? api.cancellations.list('OPEN') : Promise.resolve([])), [enabled]);
  return { cancellations: q.data?.length ?? 0 };
}

export function NavItemLink({ item, counters, onNavigate }: { item: NavItem; counters: { cancellations: number }; onNavigate?: () => void }) {
  const Icon = item.icon;
  const count = item.counter ? counters[item.counter] : 0;
  return (
    <NavLink
      to={item.to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-md px-3 no-underline',
          isActive ? 'bg-brand font-semibold text-on-brand' : 'text-ink-muted hover:bg-surface hover:text-ink',
        )
      }
    >
      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      <span className="flex-1">{item.label}</span>
      {item.pro && <span className="rounded-full border border-current px-2 py-0.5 type-caption font-semibold opacity-90">Pro</span>}
      {count > 0 && <CountPill count={count} label={`${count} open`} />}
    </NavLink>
  );
}

function FooterPanel() {
  const { user, business } = useSession();
  const fmt = useFormat();
  const isStaff = user.role === 'STAFF';
  const today = todayKey(business.timeZone);
  const shift = useQuery(['schedule'], () => (isStaff ? api.me.schedule(today, today) : Promise.resolve(null)), [isStaff, today]);

  if (isStaff) {
    const day = shift.data?.days[0];
    return (
      <div className="mt-auto flex flex-col gap-1 rounded-lg bg-plum p-4 text-on-plum">
        <div className="flex items-center justify-between gap-2">
          <b className="font-semibold">Today’s shift</b>
          {day?.hours && (
            <span className="flex items-center gap-1.5 type-body-sm">
              <i className="size-2 rounded-full bg-marigold" aria-hidden="true" />
              Working
            </span>
          )}
        </div>
        <span className="type-body-sm">
          {shift.data === undefined
            ? 'Loading…'
            : day?.hours
              ? `${fmt.timeRange(day.hours.start, day.hours.end)}${day.breaks[0] ? ` · Break ${fmt.time(day.breaks[0].start)}` : ''}`
              : 'Not working today'}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-auto flex flex-col gap-1 rounded-lg bg-plum p-4 text-on-plum">
      <div className="flex items-center justify-between gap-2">
        <b className="font-semibold">AI receptionist</b>
        <span className="flex items-center gap-1.5 type-body-sm">
          <i className={cn('size-2 rounded-full', business.receptionistActive ? 'bg-marigold' : 'bg-on-plum/50')} aria-hidden="true" />
          {business.receptionistActive ? 'Live' : 'Paused'}
        </span>
      </div>
      <span className="type-body-sm">
        {business.receptionistActive ? 'Answering calls in Urdu and English' : 'Calls go to your transfer number'}
      </span>
    </div>
  );
}

export function Sidebar() {
  const { user, business } = useSession();
  const counters = useNavCounters();
  const subtitle = user.role === 'OWNER' ? `${business.plan === 'PRO' ? 'Pro' : 'Free'} plan · Owner` : ROLE_LABEL[user.role];

  return (
    <aside aria-label="Sidebar" className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-raised px-4 py-6 lg:flex">
      <Wordmark className="px-2" />
      <div className="flex min-h-11 flex-col justify-center rounded-md border border-line bg-surface px-3 py-2">
        <span className="font-semibold">{business.name}</span>
        <span className="type-body-sm text-ink-muted">{subtitle}</span>
      </div>
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAVIGATION[user.role].map((item) => (
          <div key={item.to} className="contents">
            {item.groupStart && <hr className="mx-3 my-2 border-line" />}
            <NavItemLink item={item} counters={counters} />
          </div>
        ))}
      </nav>
      <FooterPanel />
    </aside>
  );
}
