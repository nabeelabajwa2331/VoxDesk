import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { api, errorMessage, isApiError } from '../../api';
import { useMutation, useQuery } from '../../lib/query';
import type { Customer } from '../../types/domain';
import { useFormat, useSession } from '../auth/AuthProvider';
import { Card } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Banner, EmptyState, QueryView, Loading, ErrorState } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { Pencil, UserPlus, UserRound } from '../../components/icons';
import { StatusBadge } from '../appointments/status';
import { AppointmentDrawer } from '../appointments/AppointmentDrawer';

export function CustomersPage() {
  const { user } = useSession();
  const fmt = useFormat();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | 'new' | null>(null);
  const isStaff = user.role === 'STAFF';
  const canEdit = user.role === 'OWNER' || user.role === 'RECEPTIONIST';
  const list = useQuery(['customers'], () => api.customers.list({ search }), [search]);

  const setSearch = (v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set('q', v);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  const th = 'px-3 py-3 text-left type-label text-ink-muted whitespace-nowrap first:pl-6 last:pr-6';
  const td = 'px-3 py-3 whitespace-nowrap first:pl-6 last:pr-6';

  return (
    <Page>
      <PageHeader
        title={isStaff ? 'My customers' : 'Customers'}
        description={isStaff ? 'People who have booked with you.' : 'Everyone who has booked with the salon.'}
        actions={
          canEdit ? (
            <Button variant="primary" icon={<UserPlus size={20} strokeWidth={1.75} aria-hidden="true" />} onClick={() => setEditing('new')}>
              Add customer
            </Button>
          ) : undefined
        }
      />
      <Card>
        <div className="p-6">
          <TextField
            className="max-w-md"
            label="Search"
            type="search"
            value={search}
            placeholder={isStaff ? 'Customer name' : 'Name or phone number'}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <QueryView
          query={list}
          isEmpty={(d) => d.length === 0}
          empty={
            <EmptyState
              icon={<UserRound size={20} strokeWidth={1.75} aria-hidden="true" />}
              title={search ? `No customer matches “${search}”` : 'No customers yet'}
              body={search ? 'Check the spelling or search by phone number.' : undefined}
            />
          }
        >
          {(rows) => (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full border-collapse">
                  <caption className="sr-only">Customers</caption>
                  <thead>
                    <tr className="border-t border-line">
                      <th scope="col" className={th}>Name</th>
                      {!isStaff && <th scope="col" className={th}>Contact</th>}
                      <th scope="col" className={`${th} text-right`}>Appointments</th>
                      <th scope="col" className={th}>Last visit</th>
                      <th scope="col" className={th}>Next visit</th>
                      <th scope="col" className={th}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id} className="cursor-pointer border-t border-line hover:bg-surface" onClick={() => setOpenId(c.id)}>
                        <td className={td}>
                          <button type="button" className="font-semibold hover:text-brand-strong" onClick={(e) => { e.stopPropagation(); setOpenId(c.id); }}>
                            {c.name}
                          </button>
                        </td>
                        {!isStaff && (
                          <td className={td}>
                            {c.phone}
                            {c.email && <span className="block type-body-sm text-ink-muted">{c.email}</span>}
                          </td>
                        )}
                        <td className={`${td} text-right`}>{c.appointmentCount}</td>
                        <td className={td}>{c.lastAppointmentAt ? fmt.dateShort(c.lastAppointmentAt) : <span className="text-ink-muted">None yet</span>}</td>
                        <td className={td}>{c.nextAppointmentAt ? fmt.dateShort(c.nextAppointmentAt) : <span className="text-ink-muted">Not booked</span>}</td>
                        <td className={`${td} max-w-64 truncate text-ink-muted`}>{c.notes ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="sm:hidden">
                {rows.map((c) => (
                  <li key={c.id} className="border-t border-line">
                    <button type="button" onClick={() => setOpenId(c.id)} className="flex w-full flex-col gap-1 px-4 py-4 text-left">
                      <span className="font-semibold">{c.name}</span>
                      {c.phone && <span className="type-body-sm text-ink-muted">{c.phone}</span>}
                      <span className="type-body-sm text-ink-muted">
                        {c.appointmentCount} appointments · {c.lastAppointmentAt ? `last ${fmt.dateShort(c.lastAppointmentAt)}` : 'no visits yet'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </QueryView>
      </Card>

      <CustomerDrawer customerId={openId} onClose={() => setOpenId(null)} onEdit={canEdit ? (c) => setEditing(c) : undefined} />
      {editing && <CustomerFormDialog customer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Page>
  );
}

function CustomerDrawer({ customerId, onClose, onEdit }: { customerId: string | null; onClose: () => void; onEdit?: (c: Customer) => void }) {
  return (
    <Dialog open={customerId !== null} onClose={onClose} variant="drawer" title="Customer">
      {customerId && <CustomerDetails key={customerId} id={customerId} onEdit={onEdit} />}
    </Dialog>
  );
}

function CustomerDetails({ id, onEdit }: { id: string; onEdit?: (c: Customer) => void }) {
  const fmt = useFormat();
  const customer = useQuery(['customers'], () => api.customers.get(id), [id]);
  const history = useQuery(['appointments'], () => api.customers.history(id), [id]);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  if (customer.error && !customer.data) return <ErrorState error={customer.error} onRetry={customer.reload} />;
  if (!customer.data) return <Loading rows={5} />;
  const c = customer.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="type-heading-md">{c.name}</p>
          <p className="text-ink-muted">Customer since {fmt.dateShort(c.createdAt)}</p>
        </div>
        {onEdit && (
          <Button size="sm" icon={<Pencil size={16} strokeWidth={1.75} aria-hidden="true" />} onClick={() => onEdit(c)}>
            Edit
          </Button>
        )}
      </div>
      {(c.phone || c.email) && (
        <dl className="m-0 grid grid-cols-[100px_1fr] gap-y-2">
          {c.phone && (
            <>
              <dt className="type-label text-ink-muted">Phone</dt>
              <dd className="m-0">
                <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>
              </dd>
            </>
          )}
          {c.email && (
            <>
              <dt className="type-label text-ink-muted">Email</dt>
              <dd className="m-0 break-all">
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </dd>
            </>
          )}
        </dl>
      )}
      {c.notes && (
        <div className="rounded-md border border-line bg-surface px-4 py-3">
          <p className="type-label text-ink-muted">Notes</p>
          <p className="mt-1">{c.notes}</p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="type-label text-ink-muted">Appointment history</h3>
        {history.data === undefined ? (
          <Loading rows={3} />
        ) : history.data.length === 0 ? (
          <p className="text-ink-muted">No appointments yet.</p>
        ) : (
          <ul className="flex flex-col rounded-md border border-line">
            {history.data.map((a) => (
              <li key={a.id} className="border-t border-line first:border-t-0">
                <button type="button" onClick={() => setAppointmentId(a.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{a.serviceName}</span>
                    <span className="type-body-sm text-ink-muted">
                      {fmt.dateTime(a.start)} · {a.staffName}
                    </span>
                  </span>
                  <StatusBadge appointment={a} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <AppointmentDrawer appointmentId={appointmentId} onClose={() => setAppointmentId(null)} />
    </div>
  );
}

function CustomerFormDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [notes, setNotes] = useState(customer?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation(
    () => {
      const input = { name, phone, email: email || undefined, notes: notes || undefined };
      return customer ? api.customers.update(customer.id, input) : api.customers.create(input);
    },
    { invalidates: ['customers', 'appointments'] },
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!name.trim()) local.name = 'Enter the customer’s name.';
    if (phone.replace(/\D/g, '').length < 10) local.phone = 'Enter a full phone number.';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) local.email = 'Enter a valid email or leave it empty.';
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      const c = await save.run();
      if (!c) return;
      toast.success(customer ? 'Customer updated' : 'Customer added', c.name);
      onClose();
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(err.fields);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={customer ? 'Edit customer' : 'Add customer'}
      footer={
        <>
          <Button onClick={onClose} disabled={save.pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="customer-form" loading={save.pending}>
            Save
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {save.error !== undefined && !(isApiError(save.error) && save.error.fields) && <Banner tone="danger">{errorMessage(save.error)}</Banner>}
        <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <TextField label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
        <TextField label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextAreaField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} hint="Visible to the staff member doing the appointment." />
      </form>
    </Dialog>
  );
}
