import { useState, type FormEvent } from 'react';
import { api, errorMessage, isApiError } from '../../api';
import { useMutation, useQuery } from '../../lib/query';
import type { NotificationPreferences, StaffProfile } from '../../types/domain';
import { useFormat } from '../auth/AuthProvider';
import { Card, CardHeader } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { SelectField, Switch, TextField } from '../../components/ui/Field';
import { Banner, ErrorState, Loading } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { formatClock, hoursSummary } from '../staff-management/WorkingHoursEditor';

export function MyProfilePage() {
  const q = useQuery(['profile'], () => api.me.profile(), []);
  return (
    <Page>
      <PageHeader title="My profile" description="Your details, services and how we contact you." />
      {q.error && !q.data ? <ErrorState error={q.error} onRetry={q.reload} /> : !q.data ? <Loading rows={6} /> : <ProfileBody profile={q.data} />}
    </Page>
  );
}

function ProfileBody({ profile }: { profile: StaffProfile }) {
  const fmt = useFormat();
  const toast = useToast();
  const [phone, setPhone] = useState(profile.user.phone);
  const [email, setEmail] = useState(profile.user.email);
  const [prefs, setPrefs] = useState<NotificationPreferences>(profile.notifications);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const contact = useMutation(() => api.me.updateProfile({ phone, email }), { invalidates: ['profile'] });
  const notify = useMutation(() => api.me.updateProfile({ notifications: prefs }), { invalidates: ['profile'] });

  async function saveContact(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (phone.replace(/\D/g, '').length < 10) local.phone = 'Enter a full phone number.';
    if (!/^\S+@\S+\.\S+$/.test(email)) local.email = 'Enter a valid email.';
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      await contact.run();
      toast.success('Contact details saved');
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(err.fields);
    }
  }

  async function savePrefs() {
    try {
      await notify.run();
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error('Could not save', errorMessage(err));
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Personal and contact information" />
        <form onSubmit={saveContact} noValidate className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex items-center gap-3">
            <Avatar name={profile.user.name} />
            <div>
              <p className="font-semibold">{profile.user.name}</p>
              <p className="type-body-sm text-ink-muted">{profile.staff.title}</p>
            </div>
          </div>
          {contact.error !== undefined && !(isApiError(contact.error) && contact.error.fields) && <Banner tone="danger">{errorMessage(contact.error)}</Banner>}
          <TextField label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
          <p className="type-body-sm text-ink-muted">Your name and job title are managed by the salon owner.</p>
          <Button type="submit" className="self-start" loading={contact.pending} disabled={phone === profile.user.phone && email === profile.user.email}>
            Save contact details
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Notification preferences" />
        <div className="flex flex-col gap-2 px-6 pb-6">
          <Switch checked={prefs.newBooking} onChange={(v) => setPrefs((p) => ({ ...p, newBooking: v }))} label="New bookings with me" />
          <Switch checked={prefs.cancellation} onChange={(v) => setPrefs((p) => ({ ...p, cancellation: v }))} label="Cancellations and changes" />
          <Switch checked={prefs.dailySummary} onChange={(v) => setPrefs((p) => ({ ...p, dailySummary: v }))} label="Tomorrow’s schedule each evening" />
          <SelectField label="Send by" className="max-w-xs" value={prefs.channel} onChange={(e) => setPrefs((p) => ({ ...p, channel: e.target.value as NotificationPreferences['channel'] }))}>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
          </SelectField>
          <Button className="mt-2 self-start" onClick={savePrefs} loading={notify.pending} disabled={JSON.stringify(prefs) === JSON.stringify(profile.notifications)}>
            Save preferences
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Assigned services" />
        <ul className="pb-2">
          {profile.services.map((s) => (
            <li key={s.id} className="flex justify-between gap-3 border-t border-line px-6 py-3">
              <span className="font-semibold">{s.name}</span>
              <span className="text-ink-muted">{fmt.duration(s.durationMin)}</span>
            </li>
          ))}
          {profile.services.length === 0 && <li className="px-6 pb-4 text-ink-muted">No services assigned yet.</li>}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Working hours" description="Set by the salon owner" />
        <ul className="pb-2">
          {hoursSummary(profile.staff.workingHours, formatClock).map((line) => {
            const [day, hours] = line.split(': ');
            return (
              <li key={line} className="flex justify-between gap-3 border-t border-line px-6 py-3">
                <span className="font-semibold">{day}</span>
                <span className={hours === 'Closed' ? 'text-ink-muted' : ''}>{hours === 'Closed' ? 'Day off' : hours}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
