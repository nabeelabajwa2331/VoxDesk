import { useState, type FormEvent } from 'react';
import { api, errorMessage, isApiError } from '../../api';
import { useMutation, useQuery } from '../../lib/query';
import { cn } from '../../lib/cn';
import type { Customer } from '../../types/domain';
import { useFormat } from '../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Banner, Loading } from '../../components/ui/States';
import { Search, UserPlus } from '../../components/icons';

interface Props {
  value: Customer | null;
  onChange: (c: Customer) => void;
}

export function CustomerPicker({ value, onChange }: Props) {
  const fmt = useFormat();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const q = useQuery(['customers'], () => api.customers.list({ search }), [search]);

  if (adding) {
    return (
      <NewCustomerForm
        initialName={/\d/.test(search) ? '' : search}
        initialPhone={/\d/.test(search) ? search : ''}
        onCancel={() => setAdding(false)}
        onCreated={(c) => {
          setAdding(false);
          onChange(c);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex h-11 items-center gap-2 rounded-md border border-line-strong bg-raised px-3 text-ink-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
        <Search size={20} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or phone number"
          aria-label="Search customers by name or phone"
          className="min-w-0 flex-1 bg-transparent text-ink outline-none"
        />
      </label>
      {q.data === undefined ? (
        <Loading rows={3} />
      ) : (
        <ul className="flex max-h-72 flex-col overflow-y-auto rounded-md border border-line" aria-label="Matching customers">
          {q.data.length === 0 && <li className="px-4 py-3 text-ink-muted">No customer matches “{search}”.</li>}
          {q.data.slice(0, 30).map((c) => {
            const selected = value?.id === c.id;
            return (
              <li key={c.id} className="border-t border-line first:border-t-0">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(c)}
                  className={cn('flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left', selected ? 'bg-brand text-on-brand' : 'hover:bg-surface')}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{c.name}</span>
                    <span className={cn('type-body-sm', selected ? '' : 'text-ink-muted')}>{c.phone}</span>
                  </span>
                  <span className={cn('shrink-0 type-body-sm', selected ? '' : 'text-ink-muted')}>
                    {c.lastAppointmentAt ? `Last visit ${fmt.dateShort(c.lastAppointmentAt)}` : 'New customer'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Button className="self-start" icon={<UserPlus size={20} strokeWidth={1.75} aria-hidden="true" />} onClick={() => setAdding(true)}>
        Add new customer
      </Button>
    </div>
  );
}

function NewCustomerForm({
  initialName,
  initialPhone,
  onCancel,
  onCreated,
}: {
  initialName: string;
  initialPhone: string;
  onCancel: () => void;
  onCreated: (c: Customer) => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation(() => api.customers.create({ name, phone, email: email || undefined, notes: notes || undefined }), {
    invalidates: ['customers'],
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!name.trim()) local.name = 'Enter the customer’s name.';
    if (phone.replace(/\D/g, '').length < 10) local.phone = 'Enter a full phone number.';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) local.email = 'Enter a valid email or leave it empty.';
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      const c = await create.run();
      if (c) onCreated(c);
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(err.fields);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {create.error !== undefined && !isApiError(create.error, 'VALIDATION') && <Banner tone="danger">{errorMessage(create.error)}</Banner>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="off" required />
        <TextField label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} placeholder="0300 123 4567" required />
      </div>
      <TextField label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <TextAreaField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} hint="Visible to the staff member doing the appointment." />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" loading={create.pending}>
          Save customer
        </Button>
        <Button onClick={onCancel} disabled={create.pending}>
          Back to search
        </Button>
      </div>
    </form>
  );
}
