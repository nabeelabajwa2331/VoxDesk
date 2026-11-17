import { useState, type FormEvent, type ReactNode } from 'react';
import { api, errorMessage, isApiError } from '../../api';
import { useMutation } from '../../lib/query';
import { createFormatter } from '../../lib/format';
import type { Business, DateFormat } from '../../types/domain';
import { useAuth, useSession } from '../auth/AuthProvider';
import { Card, CardHeader } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SelectField, Switch, TextAreaField, TextField } from '../../components/ui/Field';
import { Banner } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { WorkingHoursEditor, validateHours } from '../staff-management/WorkingHoursEditor';

const TIME_ZONES = ['Asia/Karachi', 'Asia/Dubai', 'Asia/Riyadh', 'Europe/London', 'America/New_York', 'UTC'];
const CURRENCIES = ['PKR', 'AED', 'SAR', 'GBP', 'USD'];
const LOCALES: { value: string; label: string }[] = [
  { value: 'en-PK', label: 'English (Pakistan)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-US', label: 'English (US)' },
];

type Section = 'profile' | 'hours' | 'locale' | 'policy' | 'notifications';

export function SettingsPage() {
  return (
    <Page>
      <PageHeader title="Settings" description="Business details, hours, regional formats and your account." />
      <div className="grid gap-6 xl:grid-cols-2">
        <BusinessSection section="profile" title="Business profile" />
        <BusinessSection section="locale" title="Time zone and formats" />
        <BusinessSection section="hours" title="Opening hours" />
        <BusinessSection section="policy" title="Cancellation policy" />
        <BusinessSection section="notifications" title="Notifications" />
        <AccountSection />
      </div>
    </Page>
  );
}

function BusinessSection({ section, title }: { section: Section; title: string }) {
  const { business } = useSession();
  const { updateBusiness } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<Business>(business);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Business>(k: K, v: Business[K]) => setForm((f) => ({ ...f, [k]: v }));

  const fields: Record<Section, (keyof Business)[]> = {
    profile: ['name', 'phone', 'email', 'address'],
    hours: ['workingHours'],
    locale: ['timeZone', 'currency', 'locale', 'dateFormat'],
    policy: ['cancellationPolicy'],
    notifications: ['notifications'],
  };
  const patch = Object.fromEntries(fields[section].map((k) => [k, form[k]])) as Partial<Business>;
  const dirty = fields[section].some((k) => JSON.stringify(form[k]) !== JSON.stringify(business[k]));
  const save = useMutation(() => api.business.update(patch), { invalidates: ['appointments', 'analytics'] });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (section === 'profile') {
      if (!form.name.trim()) local.name = 'Enter your business name.';
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) local.email = 'Enter a valid email.';
    }
    if (section === 'hours') {
      const err = validateHours(form.workingHours);
      if (err) local.workingHours = err;
    }
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      const updated = await save.run();
      if (!updated) return;
      updateBusiness(updated);
      setForm(updated);
      toast.success(`${title} saved`);
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(err.fields);
    }
  }

  let body: ReactNode;
  if (section === 'profile') {
    body = (
      <>
        <TextField label="Business name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
        </div>
        <TextAreaField label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} />
      </>
    );
  } else if (section === 'hours') {
    body = <WorkingHoursEditor value={form.workingHours} onChange={(v) => set('workingHours', v)} error={errors.workingHours} />;
  } else if (section === 'locale') {
    const preview = (() => {
      try {
        const f = createFormatter(form);
        const sample = new Date().toISOString();
        return `${f.date(sample)} · ${f.time(sample)} · ${f.money(1500)}`;
      } catch {
        return null;
      }
    })();
    body = (
      <>
        <SelectField label="Time zone" value={form.timeZone} onChange={(e) => set('timeZone', e.target.value)} error={errors.timeZone} hint="Every time in the app is shown in this zone.">
          {TIME_ZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </SelectField>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Currency" value={form.currency} onChange={(e) => set('currency', e.target.value)} error={errors.currency}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          <SelectField label="Number format" value={form.locale} onChange={(e) => set('locale', e.target.value)}>
            {LOCALES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </SelectField>
        </div>
        <SelectField label="Date format" value={form.dateFormat} onChange={(e) => set('dateFormat', e.target.value as DateFormat)}>
          <option value="medium">Tue, 17 Nov 2026</option>
          <option value="dmy">17/11/2026</option>
          <option value="iso">2026-11-17</option>
        </SelectField>
        {preview && <p className="type-body-sm text-ink-muted">Preview: {preview}</p>}
      </>
    );
  } else if (section === 'policy') {
    const p = form.cancellationPolicy;
    body = (
      <>
        <p className="type-body-sm text-ink-muted">These rules are saved for your team and the receptionist to follow. Leave the notice empty if you do not have one.</p>
        <TextField
          label="Notice needed (hours)"
          type="number"
          min={0}
          className="max-w-xs"
          value={p.noticeHours ?? ''}
          onChange={(e) => set('cancellationPolicy', { ...p, noticeHours: e.target.value === '' ? null : Number(e.target.value) })}
        />
        <Switch
          checked={p.allowRetain}
          onChange={(v) => set('cancellationPolicy', { ...p, allowRetain: v })}
          label="Allow keeping a booking after a request"
          description="Reception can talk the customer round and keep the appointment."
        />
        <TextAreaField label="Policy note for your team" value={p.note} onChange={(e) => set('cancellationPolicy', { ...p, note: e.target.value })} rows={2} />
      </>
    );
  } else {
    const n = form.notifications;
    body = (
      <>
        <Switch checked={n.newBooking} onChange={(v) => set('notifications', { ...n, newBooking: v })} label="New bookings" />
        <Switch checked={n.cancellation} onChange={(v) => set('notifications', { ...n, cancellation: v })} label="Cancellations and requests" />
        <Switch checked={n.dailySummary} onChange={(v) => set('notifications', { ...n, dailySummary: v })} label="Daily summary" description="Sent every evening with tomorrow’s bookings." />
        <SelectField label="Send by" value={n.channel} className="max-w-xs" onChange={(e) => set('notifications', { ...n, channel: e.target.value as typeof n.channel })}>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="SMS">SMS</option>
          <option value="EMAIL">Email</option>
        </SelectField>
      </>
    );
  }

  return (
    <Card>
      <CardHeader title={title} />
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4 px-6 pb-6">
        {save.error !== undefined && !(isApiError(save.error) && save.error.fields) && <Banner tone="danger">{errorMessage(save.error)}</Banner>}
        {body}
        <div className="mt-auto flex gap-3 pt-2">
          <Button type="submit" variant={dirty ? 'primary' : 'outline'} disabled={!dirty} loading={save.pending}>
            Save
          </Button>
          {dirty && (
            <Button onClick={() => setForm(business)} disabled={save.pending}>
              Discard
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

function AccountSection() {
  const { user, business } = useSession();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const change = useMutation(() => api.auth.changePassword(current, next));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!current) local.current = 'Enter your current password.';
    if (next.length < 8) local.next = 'Use at least 8 characters.';
    if (next !== repeat) local.repeat = 'The passwords do not match.';
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      await change.run();
      toast.success('Password changed');
      setCurrent('');
      setNext('');
      setRepeat('');
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(err.fields);
    }
  }

  return (
    <Card>
      <CardHeader title="Account and security" />
      <div className="flex flex-col gap-4 px-6 pb-6">
        <dl className="m-0 grid grid-cols-[100px_1fr] gap-y-2">
          <dt className="type-label text-ink-muted">Name</dt>
          <dd className="m-0">{user.name}</dd>
          <dt className="type-label text-ink-muted">Email</dt>
          <dd className="m-0 break-all">{user.email}</dd>
          <dt className="type-label text-ink-muted">Plan</dt>
          <dd className="m-0">{business.plan === 'PRO' ? 'Pro' : 'Free'}</dd>
        </dl>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4 border-t border-line pt-4">
          <h3 className="font-semibold">Change password</h3>
          {change.error !== undefined && !(isApiError(change.error) && change.error.fields) && <Banner tone="danger">{errorMessage(change.error)}</Banner>}
          <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} hint="At least 8 characters." />
            <TextField label="Repeat new password" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} error={errors.repeat} />
          </div>
          <Button type="submit" className="self-start" loading={change.pending}>
            Change password
          </Button>
        </form>
      </div>
    </Card>
  );
}
