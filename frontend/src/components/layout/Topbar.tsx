import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { api, USING_MOCKS } from '../../api';
import { invalidate, useQuery } from '../../lib/query';
import { findNavItem, homePath, ROLE_LABEL } from '../../config/navigation';
import { useAuth, useFormat, useSession } from '../../features/auth/AuthProvider';
import { useTheme } from '../../lib/theme';
import { cn } from '../../lib/cn';
import { Bell, ChevronDown, LogOut, Moon, Search, Sun } from '../icons';
import { IconButton } from '../ui/Button';
import { Popover, MenuItem } from '../ui/Popover';
import { Avatar } from '../ui/Avatar';
import { Wordmark } from '../ui/Logo';
import { CountPill } from '../ui/Badge';
import { Spinner } from '../ui/States';

export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  return (
    <IconButton label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggle}>
      {theme === 'dark' ? <Sun size={20} strokeWidth={1.75} aria-hidden="true" /> : <Moon size={20} strokeWidth={1.75} aria-hidden="true" />}
    </IconButton>
  );
}

export function NotificationsMenu() {
  const fmt = useFormat();
  const navigate = useNavigate();
  const q = useQuery(['notifications'], () => api.notifications.list(), []);
  const unread = q.data?.filter((n) => !n.read).length ?? 0;

  return (
    <Popover
      label="Notifications"
      trigger={(p) => (
        <IconButton label={unread ? `Notifications, ${unread} unread` : 'Notifications'} {...p}>
          <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
          {unread > 0 && <CountPill count={unread} label="" className="absolute -top-1.5 -right-1.5" />}
        </IconButton>
      )}
    >
      {(close) => (
        <div className="flex max-h-[70dvh] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <span className="font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                className="min-h-9 type-body-sm font-semibold text-brand-strong"
                onClick={async () => {
                  await api.notifications.markAllRead();
                  invalidate('notifications');
                }}
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
            {q.data === undefined ? (
              <div className="flex justify-center p-6">
                <Spinner />
              </div>
            ) : q.data.length === 0 ? (
              <p className="p-6 text-center text-ink-muted">You are all caught up.</p>
            ) : (
              <ul>
                {q.data.map((n) => (
                  <li key={n.id} className="border-t border-line first:border-t-0">
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        if (n.href) navigate(n.href);
                      }}
                      className="flex w-full gap-3 px-4 py-3 text-left hover:bg-surface"
                    >
                      <span aria-hidden="true" className={cn('mt-2 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand')} />
                      <span className="flex min-w-0 flex-col">
                        <span className={cn(n.read ? '' : 'font-semibold')}>{n.title}</span>
                        <span className="type-body-sm text-ink-muted">{n.body}</span>
                        <span className="type-caption text-ink-muted">{fmt.relative(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="sr-only">Unread</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}

export function AccountMenu({ compact }: { compact?: boolean }) {
  const { user, business } = useSession();
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <Popover
      label="Account"
      width="w-72"
      trigger={(p) => (
        <button type="button" aria-label="Account menu" className="flex min-h-11 items-center gap-2 rounded-md pr-1 text-left" {...p}>
          <Avatar name={user.name} />
          {!compact && (
            <span className="hidden flex-col type-body-sm font-semibold xl:flex">
              {user.name}
              <span className="font-normal text-ink-muted">{ROLE_LABEL[user.role]}</span>
            </span>
          )}
          {!compact && <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" className="hidden xl:block" />}
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col py-2">
          <div className="border-b border-line px-4 pt-1 pb-3">
            <p className="font-semibold">{user.name}</p>
            <p className="type-body-sm text-ink-muted">{user.email}</p>
            <p className="type-body-sm text-ink-muted">
              {ROLE_LABEL[user.role]} at {business.name}
            </p>
          </div>
          {user.role === 'STAFF' && (
            <MenuItem
              onClick={() => {
                close();
                navigate('/staff/profile');
              }}
            >
              My profile
            </MenuItem>
          )}
          {user.role === 'OWNER' && (
            <MenuItem
              onClick={() => {
                close();
                navigate('/owner/settings');
              }}
            >
              Settings
            </MenuItem>
          )}
          <MenuItem
            icon={<LogOut size={20} strokeWidth={1.75} aria-hidden="true" />}
            onClick={async () => {
              close();
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            Sign out
          </MenuItem>
        </div>
      )}
    </Popover>
  );
}

function GlobalSearch() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const placeholder = user.role === 'STAFF' ? 'Search my customers' : 'Search by name or phone';

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    navigate(`${homePath(user.role)}/customers?q=${encodeURIComponent(q)}`);
  }

  return (
    <form role="search" onSubmit={submit} className="hidden md:block">
      <label className="flex h-11 w-72 items-center gap-2 rounded-md border border-line-strong bg-raised px-3 text-ink-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
        <Search size={20} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent text-ink outline-none"
        />
      </label>
    </form>
  );
}

export function Topbar() {
  const { user, business } = useSession();
  const { pathname } = useLocation();
  const current = findNavItem(user.role, pathname);

  return (
    <>
      <div className="flex min-h-16 items-center gap-3 border-b border-line bg-raised px-4 py-2 lg:hidden">
        <Link to={homePath(user.role)} className="flex-1 no-underline" aria-label="Home">
          <Wordmark size={32} />
        </Link>
        <ThemeToggle />
        <NotificationsMenu />
        <AccountMenu compact />
      </div>
      <header className="hidden min-h-18 items-center gap-4 border-b border-line px-10 py-3 lg:flex">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2 type-body-sm text-ink-muted">
          <span>{business.name}</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-semibold text-ink">
            {current?.label ?? 'Page'}
          </span>
          {USING_MOCKS && (
            <span className="ml-2 rounded-full border border-line-strong px-2 py-0.5 type-caption" title="Data lives in this browser only and resets on reload">
              Demo data
            </span>
          )}
        </nav>
        <GlobalSearch />
        <ThemeToggle />
        <NotificationsMenu />
        <AccountMenu />
      </header>
    </>
  );
}
