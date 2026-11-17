import { lazy, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Link, type RouteObject } from 'react-router';
import type { Role } from '../types/domain';
import { USING_MOCKS } from '../api';
import { AppShell } from '../components/layout/AppShell';
import { HomeRedirect, RequireAuth, RequireRole } from '../features/auth/guards';
import { LoginPage } from '../features/auth/LoginPage';

function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType }));
}

const OwnerOverview = page(() => import('../features/overview/OwnerOverview'), 'OwnerOverview');
const ReceptionOverview = page(() => import('../features/overview/ReceptionOverview'), 'ReceptionOverview');
const StaffOverview = page(() => import('../features/staff-portal/StaffOverview'), 'StaffOverview');
const CalendarPage = page(() => import('../features/calendar/CalendarPage'), 'CalendarPage');
const StaffPage = page(() => import('../features/staff-management/StaffPage'), 'StaffPage');
const AnalyticsPage = page(() => import('../features/analytics/AnalyticsPage'), 'AnalyticsPage');
const ServicesPage = page(() => import('../features/services/ServicesPage'), 'ServicesPage');
const CustomersPage = page(() => import('../features/customers/CustomersPage'), 'CustomersPage');
const ReceptionistPage = page(() => import('../features/receptionist/ReceptionistPage'), 'ReceptionistPage');
const IntegrationsPage = page(() => import('../features/integrations/IntegrationsPage'), 'IntegrationsPage');
const SettingsPage = page(() => import('../features/settings/SettingsPage'), 'SettingsPage');
const BookingPage = page(() => import('../features/booking/BookingPage'), 'BookingPage');
const CancellationRequestsPage = page(() => import('../features/cancellations/CancellationRequestsPage'), 'CancellationRequestsPage');
const MySchedulePage = page(() => import('../features/staff-portal/MySchedulePage'), 'MySchedulePage');
const MyProfilePage = page(() => import('../features/staff-portal/MyProfilePage'), 'MyProfilePage');
const DemoStripePage = page(() => import('../features/billing/DemoStripePage'), 'DemoStripePage');

const AppointmentsModule = () => import('../features/appointments/AppointmentsPage');
const ManageAppointments = lazy(async () => {
  const { AppointmentsPage } = await AppointmentsModule();
  return { default: () => <AppointmentsPage mode="manage" /> };
});
const AppointmentHistory = lazy(async () => {
  const { AppointmentsPage } = await AppointmentsModule();
  return { default: () => <AppointmentsPage mode="history" /> };
});
const MyAppointments = lazy(async () => {
  const { AppointmentsPage } = await AppointmentsModule();
  return { default: () => <AppointmentsPage mode="mine" /> };
});

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
  ...(USING_MOCKS ? [{ path: '/demo-stripe', element: <DemoStripePage /> }] : []),
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
        { path: 'appointments', element: <ManageAppointments /> },
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
        { path: 'appointments', element: <ManageAppointments /> },
        { path: 'book', element: <BookingPage /> },
        { path: 'cancellations', element: <CancellationRequestsPage /> },
        { path: 'history', element: <AppointmentHistory /> },
        { path: 'customers', element: <CustomersPage /> },
      ]),
      roleSection('staff', 'STAFF', [
        { index: true, element: <StaffOverview /> },
        { path: 'appointments', element: <MyAppointments /> },
        { path: 'schedule', element: <MySchedulePage /> },
        { path: 'customers', element: <CustomersPage /> },
        { path: 'profile', element: <MyProfilePage /> },
      ]),
      { path: '*', element: <NotFound /> },
    ],
  },
]);
