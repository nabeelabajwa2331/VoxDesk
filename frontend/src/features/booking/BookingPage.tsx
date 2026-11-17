import { useState } from 'react';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { AppointmentDrawer } from '../appointments/AppointmentDrawer';
import { BookingFlow } from './BookingFlow';

export function BookingPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <Page>
      <PageHeader title="Booking management" description="Find the customer, pick a service and a free time. Free times come from the live schedule." />
      <div className="max-w-3xl">
        <BookingFlow onViewAppointment={(a) => setOpenId(a.id)} />
      </div>
      <AppointmentDrawer appointmentId={openId} onClose={() => setOpenId(null)} />
    </Page>
  );
}
