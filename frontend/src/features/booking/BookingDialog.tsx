import { useState } from 'react';
import { Plus } from '../../components/icons';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { BookingFlow } from './BookingFlow';

export function NewBookingButton({ variant = 'primary' }: { variant?: 'primary' | 'outline' }) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <>
      <Button
        variant={variant}
        icon={<Plus size={20} strokeWidth={1.75} aria-hidden="true" />}
        onClick={() => {
          setRound((r) => r + 1);
          setOpen(true);
        }}
      >
        New booking
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="lg" title="New booking" description="Free times come from the live schedule.">
        <BookingFlow key={round} />
      </Dialog>
    </>
  );
}
