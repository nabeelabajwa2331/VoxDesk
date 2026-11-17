import { useState, type FormEvent } from 'react';
import { api, errorMessage, isApiError } from '../../api';
import type { StaffInput } from '../../api';
import { useMutation, useQuery } from '../../lib/query';
import type { Service, StaffMember } from '../../types/domain';
import { Card } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { ConfirmDialog, Dialog } from '../../components/ui/Dialog';
import { Checkbox, TextField } from '../../components/ui/Field';
import { Banner, EmptyState, QueryView } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { Pencil, UserPlus, Users } from '../../components/icons';
import { WorkingHoursEditor, formatClock, hoursSummary, validateHours } from './WorkingHoursEditor';

export function StaffPage() {
  const staff = useQuery(['staff'], () => api.staff.list(), []);
  const services = useQuery(['services'], () => api.services.list(), []);
  const [profile, setProfile] = useState<StaffMember | null>(null);
  const [editing, setEditing] = useState<StaffMember | 'new' | null>(null);

  const serviceNames = (ids: string[]) =>
    (services.data ?? []).filter((s) => ids.includes(s.id)).map((s) => s.name);

  return (
    <Page>
      <PageHeader
        title="Staff management"
        description="Profiles, services, working hours and availability."
        actions={
          <Button variant="primary" icon={<UserPlus size={20} strokeWidth={1.75} aria-hidden="true" />} onClick={() => setEditing('new')}>
            Add staff member
          </Button>
        }
      />
      <Card>
        <QueryView
          query={staff}
          isEmpty={(d) => d.length === 0}
          empty={<EmptyState icon={<Users size={20} strokeWidth={1.75} aria-hidden="true" />} title="No staff yet" body="Add the people who take appointments." />}
        >
          {(rows) => (
            <ul>
              {rows.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-4 border-t border-line px-6 py-4 first:border-t-0">
                  <button type="button" onClick={() => setProfile(s)} className="flex min-w-60 flex-1 items-center gap-3 text-left">
                    <Avatar name={s.name} />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold hover:text-brand-strong">{s.name}</span>
                      <span className="type-body-sm text-ink-muted">
                        {s.title} · {serviceNames(s.serviceIds).length} services
                      </span>
                    </span>
                  </button>
                  <div className="flex min-w-40 flex-col type-body-sm">
                    <span>{s.upcomingCount} upcoming</span>
                    <span className="text-ink-muted">{s.monthCount} this month</span>
                  </div>
                  <Badge tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Active' : 'Inactive'}</Badge>
                  <Button size="sm" icon={<Pencil size={16} strokeWidth={1.75} aria-hidden="true" />} onClick={() => setEditing(s)}>
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </QueryView>
      </Card>

      {profile && (
        <StaffProfileDrawer
          member={staff.data?.find((x) => x.id === profile.id) ?? profile}
          services={serviceNames(profile.serviceIds)}
          onClose={() => setProfile(null)}
          onEdit={() => {
            setEditing(profile);
            setProfile(null);
          }}
        />
      )}
      {editing && services.data && (
        <StaffFormDialog member={editing === 'new' ? null : editing} services={services.data} onClose={() => setEditing(null)} />
      )}
    </Page>
  );
}

function StaffProfileDrawer({ member, services, onClose, onEdit }: { member: StaffMember; services: string[]; onClose: () => void; onEdit: () => void }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const toggle = useMutation(() => api.staff.setActive(member.id, !member.active), { invalidates: ['staff', 'availability'] });

  async function doToggle() {
    try {
      const s = await toggle.run();
      if (!s) return;
      toast.success(s.active ? 'Staff member activated' : 'Staff member deactivated', s.active ? `${s.name} can take bookings again.` : `${s.name} will not get new bookings.`);
      setConfirm(false);
    } catch (e) {
      toast.error('Could not update', errorMessage(e));
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      variant="drawer"
      title="Staff profile"
      footer={
        <>
          <Button variant={member.active ? 'danger' : 'outline'} onClick={() => (member.active ? setConfirm(true) : doToggle())} loading={!member.active && toggle.pending}>
            {member.active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="primary" onClick={onEdit}>
            Edit profile
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Avatar name={member.name} />
          <div>
            <p className="type-heading-md">{member.name}</p>
            <p className="text-ink-muted">{member.title}</p>
          </div>
        </div>
        <dl className="m-0 grid grid-cols-[100px_1fr] gap-y-2">
          <dt className="type-label text-ink-muted">Phone</dt>
          <dd className="m-0">{member.phone}</dd>
          <dt className="type-label text-ink-muted">Email</dt>
          <dd className="m-0 break-all">{member.email}</dd>
          <dt className="type-label text-ink-muted">Status</dt>
          <dd className="m-0">
            <Badge tone={member.active ? 'success' : 'neutral'}>{member.active ? 'Active' : 'Inactive'}</Badge>
          </dd>
          <dt className="type-label text-ink-muted">Bookings</dt>
          <dd className="m-0">
            {member.upcomingCount} upcoming, {member.monthCount} this month
          </dd>
        </dl>
        <div>
          <h3 className="type-label text-ink-muted">Services</h3>
          <p className="mt-1">{services.length ? services.join(', ') : 'None assigned'}</p>
        </div>
        <div>
          <h3 className="type-label text-ink-muted">Working hours</h3>
          <ul className="mt-1">
            {hoursSummary(member.workingHours, formatClock).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={doToggle}
        pending={toggle.pending}
        title={`Deactivate ${member.name}?`}
        body="They will not be offered for new bookings. Existing appointments stay as they are, so move or cancel them if needed."
        confirmLabel="Deactivate"
      />
    </Dialog>
  );
}

function StaffFormDialog({ member, services, onClose }: { member: StaffMember | null; services: Service[]; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<StaffInput>(() => ({
    name: member?.name ?? '',
    title: member?.title ?? '',
    phone: member?.phone ?? '',
    email: member?.email ?? '',
    serviceIds: member?.serviceIds ?? [],
    workingHours: member?.workingHours ?? [null, ...Array.from({ length: 6 }, () => ({ open: '10:00', close: '19:00' }))],
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation(() => (member ? api.staff.update(member.id, form) : api.staff.create(form)), {
    invalidates: ['staff', 'services', 'availability'],
  });
  const set = <K extends keyof StaffInput>(k: K, v: StaffInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!form.name.trim()) local.name = 'Enter a name.';
    if (!form.title.trim()) local.title = 'Enter a job title.';
    if (form.phone.replace(/\D/g, '').length < 10) local.phone = 'Enter a full phone number.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) local.email = 'Enter a valid email.';
    const hoursError = validateHours(form.workingHours);
    if (hoursError) local.workingHours = hoursError;
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      const s = await save.run();
      if (!s) return;
      toast.success(member ? 'Profile saved' : 'Staff member added', s.name);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(err.fields);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={member ? `Edit ${member.name}` : 'Add staff member'}
      footer={
        <>
          <Button onClick={onClose} disabled={save.pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="staff-form" loading={save.pending}>
            Save
          </Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
        {save.error !== undefined && !(isApiError(save.error) && save.error.fields) && <Banner tone="danger">{errorMessage(save.error)}</Banner>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
          <TextField label="Job title" value={form.title} onChange={(e) => set('title', e.target.value)} error={errors.title} placeholder="Senior stylist" />
          <TextField label="Phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
        </div>
        <fieldset className="flex flex-col">
          <legend className="mb-1 type-label">Services they offer</legend>
          <div className="grid sm:grid-cols-2">
            {services.map((s) => (
              <Checkbox
                key={s.id}
                label={s.name}
                checked={form.serviceIds.includes(s.id)}
                onChange={(e) => set('serviceIds', e.target.checked ? [...form.serviceIds, s.id] : form.serviceIds.filter((x) => x !== s.id))}
              />
            ))}
          </div>
        </fieldset>
        <WorkingHoursEditor value={form.workingHours} onChange={(v) => set('workingHours', v)} error={errors.workingHours} />
      </form>
    </Dialog>
  );
}
