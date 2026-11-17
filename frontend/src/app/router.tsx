import { createBrowserRouter, Link, type RouteObject } from 'react-router';
import type { ReactNode } from 'react';
import type { Role } from '../types/domain';
import { AppShell } from '../components/layout/AppShell';
import { HomeRedirect, RequireAuth, RequireRole } from '../features/auth/guards';
import { LoginPage } from '../features/auth/LoginPage';
import { OwnerOverview } from '../features/overview/OwnerOverview';
import { ReceptionOverview } from '../features/overview/ReceptionOverview';
import { StaffOverview } from '../features/staff-portal/StaffOverview';
import { AppointmentsPage } from '../features/appointments/AppointmentsPage';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { StaffPage } from '../features/staff-management/StaffPage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { ServicesPage } from '../features/services/ServicesPage';
import { CustomersPage } from '../features/customers/CustomersPage';
import { ReceptionistPage } from '../features/receptionist/ReceptionistPage';
import { IntegrationsPage } from '../features/integrations/IntegrationsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { BookingPage } from '../features/booking/BookingPage';
import { CancellationRequestsPage } from '../features/cancellations/CancellationRequestsPage';
import { MySchedulePage } from '../features/staff-portal/MySchedulePage';
import { MyProfilePage } from '../features/staff-portal/MyProfilePage';

function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="type-heading-lg">Page not found</h1>
      <p className="text-ink-muted">The link may be old, or this page is not part of your dashboard.</p>
      <Link to="/">Go to your overview</Link>
    </div>
  );
}

function roleSection(path: string, role: Role, children: RouteObject[]): RouteObject {
  const guard = (el: ReactNode) => <RequireRole role={role}>{el}</RequireRole>;
  return { path, children: children.map((c) => ({ ...c, element: guard(c.element) })) };
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      roleSection('owner', 'OWNER', [
        { index: true, element: <OwnerOverview /> },
        { path: 'appointments', element: <AppointmentsPage mode="manage" /> },
        { path: 'calendar', element: <CalendarPage /> },
        { path: 'staff', element: <StaffPage /> },
        { path: 'analytics', element: <AnalyticsPage /> },
        { path: 'services', element: <ServicesPage /> },
        { path: 'customers', element: <CustomersPage /> },
        { path: 'receptionist', element: <ReceptionistPage /> },
        { path: 'integrations', element: <IntegrationsPage /> },
        { path: 'settings', element: <SettingsPage /> },
      ]),
      roleSection('reception', 'RECEPTIONIST', [
        { index: true, element: <ReceptionOverview /> },
        { path: 'appointments', element: <AppointmentsPage mode="manage" /> },
        { path: 'book', element: <BookingPage /> },
        { path: 'cancellations', element: <CancellationRequestsPage /> },
        { path: 'history', element: <AppointmentsPage mode="history" /> },
        { path: 'customers', element: <CustomersPage /> },
      ]),
      roleSection('staff', 'STAFF', [
        { index: true, element: <StaffOverview /> },
        { path: 'appointments', element: <AppointmentsPage mode="mine" /> },
        { path: 'schedule', element: <MySchedulePage /> },
        { path: 'customers', element: <CustomersPage /> },
        { path: 'profile', element: <MyProfilePage /> },
      ]),
      { path: '*', element: <NotFound /> },
    ],
  },
]);
