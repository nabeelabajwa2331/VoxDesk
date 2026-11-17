import { useState } from 'react';
import { api, errorMessage } from '../../api';
import { useMutation, useQuery } from '../../lib/query';
import type { CancellationRequest } from '../../types/domain';
import { useFormat, useSession } from '../auth/AuthProvider';
import { Card } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Segmented } from '../../components/ui/Segmented';
import { Button, buttonClass } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog, Dialog } from '../../components/ui/Dialog';
import { TextAreaField } from '../../components/ui/Field';
import { Banner, EmptyState, QueryView } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { CalendarX, Phone } from '../../components/icons';
import { SourceLabel } from '../appointments/status';

type Tab = 'OPEN' | 'HANDLED';

export function CancellationRequestsPage() {
  const [tab, setTab] = useState<Tab>('OPEN');
  const [reviewing, setReviewing] = useState<CancellationRequest | null>(null);
  const list = useQuery(['cancellations'], () => api.cancellations.list(), []);
  const fmt = useFormat();

  return (
    <Page>
      <PageHeader title="Cancellation requests" description="Customers who asked to cancel by phone or online." />
      <Card>
        <div className="p-6 pb-4">
          <Segmented<Tab>
            label="Show"
            value={tab}
            onChange={setTab}
            className="sm:w-auto sm:self-start"
            options={[
              { value: 'OPEN', label: `Open${list.data ? ` (${list.data.filter((r) => r.status === 'OPEN').length})` : ''}` },
              { value: 'HANDLED', label: 'Handled' },
            ]}
          />
        </div>
        <QueryView
          query={list}
          isEmpty={(d) => !d.some((r) => (tab === 'OPEN' ? r.status === 'OPEN' : r.status !== 'OPEN'))}
          empty={
            <EmptyState
              icon={<CalendarX size={20} strokeWidth={1.75} aria-hidden="true" />}
              title={tab === 'OPEN' ? 'No open requests' : 'No handled requests yet'}
              body={tab === 'OPEN' ? 'New requests from calls and online bookings will show here.' : undefined}
            />
          }
        >
          {(rows) => (
            <ul>
              {rows
                .filter((r) => (tab === 'OPEN' ? r.status === 'OPEN' : r.status !== 'OPEN'))
                .map((r) => (
                  <li key={r.id} className="flex flex-wrap items-start gap-4 border-t border-line px-6 py-4">
                    <div className="flex min-w-60 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.appointment.customerName}</span>
                        {r.status === 'OPEN' && <Badge tone="danger">Needs a decision</Badge>}
                        {r.status === 'APPROVED' && <Badge tone="neutral">Cancelled</Badge>}
                        {r.status === 'RETAINED' && <Badge tone="success">Booking kept</Badge>}
                      </div>
                      <span>
                        {r.appointment.serviceName} with {r.appointment.staffName} · {fmt.dateTime(r.appointment.start)}
                      </span>
                      <span className="type-body-sm text-ink-muted">{r.reason ? `“${r.reason}”` : 'No reason given.'}</span>
                      <span className="flex flex-wrap items-center gap-1.5 type-body-sm text-ink-muted">
                        Asked {fmt.relative(r.requestedAt)} via <SourceLabel source={r.channel} />
                        {r.resolvedBy && ` · handled by ${r.resolvedBy}`}
                      </span>
                    </div>
                    {r.status === 'OPEN' && (
                      <Button size="sm" onClick={() => setReviewing(r)}>
                        Review
                      </Button>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </QueryView>
      </Card>
      {reviewing && <ReviewDialog request={reviewing} onClose={() => setReviewing(null)} />}
    </Page>
  );
}

function ReviewDialog({ request, onClose }: { request: CancellationRequest; onClose: () => void }) {
  const { business } = useSession();
  const fmt = useFormat();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [keeping, setKeeping] = useState(false);
  const [note, setNote] = useState('');
  const tags = { invalidates: ['cancellations', 'appointments', 'availability', 'activity', 'schedule'] };
  const approve = useMutation(() => api.cancellations.approve(request.id), tags);
  const retain = useMutation(() => api.cancellations.retain(request.id, note), tags);
  const a = request.appointment;
  const policy = business.cancellationPolicy;
  const phone = a.customerPhone?.replace(/\s/g, '');

  async function doApprove() {
    try {
      await approve.run();
      toast.success('Appointment cancelled', `${a.customerName}, ${fmt.dateTime(a.start)}. The time is free again.`);
      onClose();
    } catch (e) {
      toast.error('Could not cancel', errorMessage(e));
    }
  }

  async function doRetain() {
    try {
      await retain.run();
      toast.success('Booking kept', `${a.customerName} stays booked for ${fmt.dateTime(a.start)}.`);
      onClose();
    } catch (e) {
      toast.error('Could not keep the booking', errorMessage(e));
    }
  }

  return (
    <>
      <Dialog
        open={!confirming && !keeping}
        onClose={onClose}
        title="Review cancellation request"
        description={`Asked ${fmt.relative(request.requestedAt)}`}
        footer={
          <>
            {policy.allowRetain && <Button onClick={() => setKeeping(true)}>Keep booking</Button>}
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Confirm cancellation
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <dl className="m-0 grid grid-cols-[110px_1fr] gap-y-2">
            <dt className="type-label text-ink-muted">Customer</dt>
            <dd className="m-0">{a.customerName}</dd>
            <dt className="type-label text-ink-muted">Appointment</dt>
            <dd className="m-0">
              {a.serviceName} with {a.staffName}
              <span className="block text-ink-muted">{fmt.date(a.start)} · {fmt.timeRange(a.start, a.end)}</span>
            </dd>
            <dt className="type-label text-ink-muted">Reason</dt>
            <dd className="m-0">{request.reason ?? 'No reason given.'}</dd>
          </dl>
          {policy.note && <Banner tone="warning">Policy: {policy.note}</Banner>}
          {phone && (
            <a href={`tel:${phone}`} className={buttonClass('outline', 'md', 'self-start no-underline')}>
              <Phone size={20} strokeWidth={1.75} aria-hidden="true" />
              Call {a.customerName.split(' ')[0]} on {a.customerPhone}
            </a>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={doApprove}
        pending={approve.pending}
        title="Cancel this appointment?"
        body={`${a.customerName} · ${a.serviceName} · ${fmt.dateTime(a.start)}. The time becomes free for other bookings. This cannot be undone.`}
        confirmLabel="Cancel appointment"
        cancelLabel="Go back"
      />

      <ConfirmDialog
        open={keeping}
        onClose={() => setKeeping(false)}
        onConfirm={doRetain}
        pending={retain.pending}
        tone="primary"
        title="Keep this booking?"
        body="The appointment stays in the diary. Let the customer know you have kept it."
        confirmLabel="Keep booking"
      >
        <TextAreaField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} hint="For example, what you agreed with the customer." rows={2} />
      </ConfirmDialog>
    </>
  );
}
