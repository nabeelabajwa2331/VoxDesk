import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import type { Role } from '../types/domain';
import {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  ChartColumn,
  CircleUserRound,
  Clock,
  History,
  LayoutDashboard,
  Calendar,
  Phone,
  Plug,
  SlidersHorizontal,
  Tag,
  UserRound,
  Users,
} from '../components/icons';

export interface NavItem {
  to: string;
  label: string;
  short?: string;
  icon: ComponentType<LucideProps>;
  pro?: boolean;
  counter?: 'cancellations';
  groupStart?: boolean;
}

export const NAVIGATION: Record<Role, NavItem[]> = {
  OWNER: [
    { to: '/owner', label: 'Overview', icon: LayoutDashboard },
    { to: '/owner/appointments', label: 'Appointments', short: 'Bookings', icon: CalendarCheck },
    { to: '/owner/calendar', label: 'Calendar', icon: Calendar },
    { to: '/owner/staff', label: 'Staff management', short: 'Staff', icon: Users },
    { to: '/owner/analytics', label: 'Revenue & analytics', short: 'Revenue', icon: ChartColumn },
    { to: '/owner/services', label: 'Services & pricing', short: 'Services', icon: Tag, pro: true },
    { to: '/owner/customers', label: 'Customers', icon: UserRound },
    { to: '/owner/receptionist', label: 'AI receptionist', short: 'AI', icon: Phone, groupStart: true },
    { to: '/owner/integrations', label: 'Integrations', icon: Plug },
    { to: '/owner/settings', label: 'Settings', icon: SlidersHorizontal },
  ],
  RECEPTIONIST: [
    { to: '/reception', label: 'Overview', icon: LayoutDashboard },
    { to: '/reception/appointments', label: 'Appointments', short: 'Bookings', icon: CalendarCheck },
    { to: '/reception/book', label: 'Booking management', short: 'Book', icon: CalendarPlus },
    { to: '/reception/cancellations', label: 'Cancellation requests', short: 'Requests', icon: CalendarX, counter: 'cancellations' },
    { to: '/reception/history', label: 'Appointment history', short: 'History', icon: History },
    { to: '/reception/customers', label: 'Customers', icon: UserRound },
  ],
  STAFF: [
    { to: '/staff', label: 'My overview', short: 'Overview', icon: LayoutDashboard },
    { to: '/staff/appointments', label: 'My appointments', short: 'Bookings', icon: CalendarCheck },
    { to: '/staff/schedule', label: 'My schedule', short: 'Schedule', icon: Clock },
    { to: '/staff/customers', label: 'My customers', short: 'Customers', icon: UserRound },
    { to: '/staff/profile', label: 'My profile', short: 'Profile', icon: CircleUserRound },
  ],
};

/** The first four entries plus "More" make up the phone tab bar. */
export const TAB_COUNT = 4;

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Owner',
  RECEPTIONIST: 'Receptionist',
  STAFF: 'Staff',
};

export function homePath(role: Role): string {
  return NAVIGATION[role][0]!.to;
}

export function findNavItem(role: Role, pathname: string): NavItem | undefined {
  const items = NAVIGATION[role];
  return [...items].sort((a, b) => b.to.length - a.to.length).find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
}

export const ScheduleIcon = CalendarClock;
