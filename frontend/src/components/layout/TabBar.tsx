import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { NAVIGATION, TAB_COUNT, findNavItem } from '../../config/navigation';
import { useSession } from '../../features/auth/AuthProvider';
import { cn } from '../../lib/cn';
import { Menu } from '../icons';
import { Dialog } from '../ui/Dialog';
import { CountPill } from '../ui/Badge';
import { NavItemLink, useNavCounters } from './Sidebar';

const tabClass = 'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-md type-caption no-underline';

export function TabBar() {
  const { user } = useSession();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const counters = useNavCounters();
  const items = NAVIGATION[user.role];
  const needsMore = items.length > TAB_COUNT + 1;
  const tabs = needsMore ? items.slice(0, TAB_COUNT) : items;
  const current = findNavItem(user.role, pathname);
  const moreActive = needsMore && !!current && !tabs.includes(current);

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-raised px-2 pt-1 pb-[calc(4px+env(safe-area-inset-bottom))] lg:hidden"
      >
        {tabs.map((item) => {
          const Icon = item.icon;
          const count = item.counter ? counters[item.counter] : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) => cn(tabClass, isActive ? 'font-semibold text-brand-strong' : 'text-ink-muted')}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              {item.short ?? item.label}
              {count > 0 && <CountPill count={count} label={`${count} open`} className="absolute top-0.5 right-[calc(50%-26px)]" />}
            </NavLink>
          );
        })}
        {needsMore && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={cn(tabClass, moreActive ? 'font-semibold text-brand-strong' : 'text-ink-muted')}
          >
            <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
            More
          </button>
        )}
      </nav>
      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu">
        <nav aria-label="All pages" className="flex flex-col gap-0.5">
          {items.map((item) => (
            <NavItemLink key={item.to} item={item} counters={counters} onNavigate={() => setMoreOpen(false)} />
          ))}
        </nav>
      </Dialog>
    </>
  );
}
