import { useState, type FormEvent } from 'react';
import { api, errorMessage, isApiError } from '../../api';
import type { ServiceInput } from '../../api';
import { useMutation, useQuery } from '../../lib/query';
import type { Service, StaffMember } from '../../types/domain';
import { useFormat, useSession } from '../auth/AuthProvider';
import { Card } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Checkbox, Switch, TextAreaField, TextField } from '../../components/ui/Field';
import { Banner, EmptyState, QueryView } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { Lock, Pencil, Plus, Tag } from '../../components/icons';
import { useBillingRedirect } from '../billing/useBilling';

export function ServicesPage() {
  const { business } = useSession();
  if (business.plan !== 'PRO') return <ServicesLocked />;
  return <ServicesManager />;
}

function ServicesManager() {
  const fmt = useFormat();
  const services = useQuery(['services'], () => api.services.list(), []);
  const staff = useQuery(['staff'], () => api.staff.list(), []);
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const staffNames = (ids: string[]) => (staff.data ?? []).filter((s) => ids.includes(s.id)).map((s) => s.name.split(' ')[0]);
  const th = 'px-3 py-3 text-left type-label text-ink-muted whitespace-nowrap first:pl-6 last:pr-6';
  const td = 'px-3 py-3 first:pl-6 last:pr-6 align-top';

  return (
    <Page>
      <PageHeader
        title="Services & pricing"
        description="What customers can book, how long it takes and what it costs. The AI receptionist quotes these prices."
        actions={
          <Button variant="primary" icon={<Plus size={20} strokeWidth={1.75} aria-hidden="true" />} onClick={() => setEditing('new')}>
            Add service
          </Button>
        }
      />
      <Card>
        <QueryView
          query={services}
          isEmpty={(d) => d.length === 0}
          empty={<EmptyState icon={<Tag size={20} strokeWidth={1.75} aria-hidden="true" />} title="No services yet" body="Add the first service customers can book." />}
        >
          {(rows) => (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <caption className="sr-only">Services</caption>
                <thead>
                  <tr>
                    <th scope="col" className={th}>Service</th>
                    <th scope="col" className={`${th} text-right`}>Duration</th>
                    <th scope="col" className={`${th} text-right`}>Price</th>
                    <th scope="col" className={th}>Staff</th>
                    <th scope="col" className={th}>Availability</th>
                    <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-t border-line">
                      <td className={td}>
                        <span className="font-semibold">{s.name}</span>
                        <span className="block max-w-80 type-body-sm text-ink-muted">{s.description}</span>
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`}>{fmt.duration(s.durationMin)}</td>
                      <td className={`${td} whitespace-nowrap text-right`}>{fmt.money(s.price)}</td>
                      <td className={td}>{staffNames(s.staffIds).join(', ') || <span className="text-ink-muted">No one assigned</span>}</td>
                      <td className={td}>
                        <Badge tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Bookable' : 'Hidden'}</Badge>
                      </td>
                      <td className={`${td} text-right`}>
                        <Button size="sm" icon={<Pencil size={16} strokeWidth={1.75} aria-hidden="true" />} onClick={() => setEditing(s)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryView>
      </Card>
      {editing && staff.data && <ServiceFormDialog service={editing === 'new' ? null : editing} staff={staff.data} onClose={() => setEditing(null)} />}
    </Page>
  );
}

function ServiceFormDialog({ service, staff, onClose }: { service: Service | null; staff: StaffMember[]; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<ServiceInput>(() => ({
    name: service?.name ?? '',
    description: service?.description ?? '',
    durationMin: service?.durationMin ?? 30,
    price: service?.price ?? 0,
    staffIds: service?.staffIds ?? [],
    active: service?.active ?? true,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation(() => (service ? api.services.update(service.id, form) : api.services.create(form)), {
    invalidates: ['services', 'staff', 'availability'],
  });
  const set = <K extends keyof ServiceInput>(k: K, v: ServiceInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!form.name.trim()) local.name = 'Enter a service name.';
    if (!Number.isFinite(form.durationMin) || form.durationMin < 5) local.durationMin = 'Use at least 5 minutes.';
    if (!Number.isFinite(form.price) || form.price < 0) local.price = 'Enter a price of 0 or more.';
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      const s = await save.run();
      if (!s) return;
      toast.success(service ? 'Service saved' : 'Service added', s.name);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(err.fields);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={service ? `Edit ${service.name}` : 'Add service'}
      footer={
        <>
          <Button onClick={onClose} disabled={save.pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="service-form" loading={save.pending}>
            Save
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {save.error !== undefined && !(isApiError(save.error) && save.error.fields) && <Banner tone="danger">{errorMessage(save.error)}</Banner>}
        <TextField label="Service name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <TextAreaField label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} hint="The AI receptionist uses this to describe the service." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Duration (minutes)" type="number" min={5} step={5} value={form.durationMin} onChange={(e) => set('durationMin', Number(e.target.value))} error={errors.durationMin} />
          <TextField label="Price (Rs)" type="number" min={0} step={50} value={form.price} onChange={(e) => set('price', Number(e.target.value))} error={errors.price} />
        </div>
        <fieldset>
          <legend className="mb-1 type-label">Staff who offer it</legend>
          <div className="grid sm:grid-cols-2">
            {staff.map((s) => (
              <Checkbox
                key={s.id}
                label={s.name}
                description={s.active ? undefined : 'Inactive'}
                checked={form.staffIds.includes(s.id)}
                onChange={(e) => set('staffIds', e.target.checked ? [...form.staffIds, s.id] : form.staffIds.filter((x) => x !== s.id))}
              />
            ))}
          </div>
        </fieldset>
        <Switch checked={form.active} onChange={(v) => set('active', v)} label="Bookable" description="Turn off to hide it from new bookings without deleting it." />
      </form>
    </Dialog>
  );
}

const PREVIEW = [
  { name: 'Haircut', duration: '45 min', price: 'Rs 2,500' },
  { name: 'Balayage', duration: '3 h', price: 'Rs 18,000' },
  { name: 'Gel manicure', duration: '1 h', price: 'Rs 3,000' },
];

function ServicesLocked() {
  const billing = useBillingRedirect();
  return (
    <Page>
      <PageHeader title="Services & pricing" description="Set up your menu of services, prices and who does what." />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2">
            <Lock size={20} strokeWidth={1.75} aria-hidden="true" />
            <span className="rounded-full border border-line-strong px-2 py-0.5 type-caption font-semibold">Pro</span>
          </div>
          <div>
            <h2 className="type-heading-md">Manage services and prices on the Pro plan</h2>
            <p className="mt-2 max-w-2xl text-ink-muted">
              Add each service with its duration and price, choose which staff offer it, and hide services you are not taking bookings for. The AI receptionist then quotes your real prices on calls.
            </p>
          </div>
          {billing.error !== undefined && <Banner tone="danger">{errorMessage(billing.error)}</Banner>}
          <Button variant="primary" className="self-start" loading={billing.pending === 'checkout'} onClick={() => billing.startCheckout('/owner/settings')}>
            Upgrade to Pro
          </Button>
          <p className="type-body-sm text-ink-muted">You pay on Stripe’s secure page. Everything else in your dashboard keeps working on the Free plan.</p>
        </div>
        <div className="border-t border-line bg-surface p-6" aria-label="Preview of the Pro feature">
          <p className="mb-3 type-label text-ink-muted">Preview</p>
          <div className="pointer-events-none select-none overflow-hidden rounded-lg border border-line bg-raised opacity-70" inert>
            {PREVIEW.map((r) => (
              <div key={r.name} className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 first:border-t-0">
                <span className="font-semibold">{r.name}</span>
                <span className="text-ink-muted">{r.duration}</span>
                <span>{r.price}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </Page>
  );
}