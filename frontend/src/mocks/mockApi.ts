import type { AppointmentQuery, VoxDeskApi } from '../api/contract';
import { ApiError } from '../api/errors';
import type {
  Analytics,
  Appointment,
  Business,
  CancellationRequest,
  Customer,
  Role,
  Slot,
  StaffMember,
  User,
} from '../types/domain';
import {
  addDays,
  dateKey,
  diffDays,
  minutesToTime,
  overlaps,
  timeToMinutes,
  weekdayOf,
  zonedToUtc,
} from '../lib/time';
import { createSeed, DEMO_PASSWORD, type AppointmentRecord, type CancellationRecord, type CustomerRecord, type Db, type StaffRecord } from './seed';

/*
 * Demo API that runs entirely in the browser. It mirrors the rules the real
 * backend enforces (roles, tenant isolation, availability, idempotency) so the
 * UI can be exercised end to end. Data lives in memory and resets on reload.
 */

const SESSION_KEY = 'voxdesk-demo-user';
const SLOT_STEP_MIN = 15;

let db: Db | undefined;
const idempotency = new Map<string, string>();
let counter = 1000;
const staffPrefs = new Map<string, Business['notifications']>();
const passwords = new Map<string, string>();

function data(): Db {
  db ??= createSeed();
  return db;
}

const nextId = (prefix: string) => `${prefix}-${++counter}`;
const nowIso = () => new Date().toISOString();

function delay<T>(value: T, ms = 220 + Math.random() * 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));
}

function fail(status: number, code: ApiError['code'], message: string, fields?: Record<string, string>): never {
  throw new ApiError(status, code, message, fields);
}

function readSessionUserId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function ctx(...roles: Role[]): { user: User; business: Business } {
  const id = readSessionUserId();
  const user = data().users.find((u) => u.id === id);
  if (!user) fail(401, 'UNAUTHENTICATED', 'Please sign in again.');
  if (roles.length && !roles.includes(user.role)) fail(403, 'FORBIDDEN', 'You do not have access to this.');
  const business = data().businesses.find((b) => b.id === user.businessId)!;
  return { user, business };
}

function findIn<T extends { id: string; businessId: string }>(list: T[], id: string, businessId: string, what: string): T {
  const item = list.find((x) => x.id === id && x.businessId === businessId);
  if (!item) fail(404, 'NOT_FOUND', `${what} not found.`);
  return item;
}

function hydrate(a: AppointmentRecord, viewer: User): Appointment {
  const d = data();
  const customer = d.customers.find((c) => c.id === a.customerId)!;
  const staff = d.staff.find((s) => s.id === a.staffId)!;
  const service = d.services.find((s) => s.id === a.serviceId)!;
  const isStaff = viewer.role === 'STAFF';
  return {
    id: a.id,
    businessId: a.businessId,
    customerId: a.customerId,
    customerName: customer.name,
    customerPhone: isStaff ? undefined : customer.phone,
    customerNotes: customer.notes,
    staffId: a.staffId,
    staffName: staff.name,
    serviceId: a.serviceId,
    serviceName: service.name,
    start: a.start,
    end: a.end,
    status: a.status,
    source: a.source,
    price: isStaff ? undefined : a.price,
    notes: a.notes,
    cancelRequested: a.cancelRequested,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

function visibleAppointments(user: User): AppointmentRecord[] {
  return data().appointments.filter(
    (a) => a.businessId === user.businessId && (user.role !== 'STAFF' || a.staffId === user.staffId),
  );
}

function staffOut(s: StaffRecord, tz: string): StaffMember {
  const today = dateKey(new Date(), tz);
  const monthStart = `${today.slice(0, 7)}-01`;
  const own = data().appointments.filter((a) => a.staffId === s.id && a.status !== 'CANCELLED');
  return {
    id: s.id,
    businessId: s.businessId,
    name: s.name,
    title: s.title,
    phone: s.phone,
    email: s.email,
    active: s.active,
    serviceIds: [...s.serviceIds],
    workingHours: s.workingHours,
    upcomingCount: own.filter((a) => new Date(a.start) > new Date() && a.status !== 'NO_SHOW').length,
    monthCount: own.filter((a) => dateKey(a.start, tz) >= monthStart && dateKey(a.start, tz) <= today).length,
  };
}

function customerOut(c: CustomerRecord, viewer: User): Customer {
  const mine = visibleAppointments(viewer)
    .filter((a) => a.customerId === c.id && a.status !== 'CANCELLED')
    .sort((x, y) => x.start.localeCompare(y.start));
  const now = nowIso();
  const past = mine.filter((a) => a.start <= now);
  const future = mine.filter((a) => a.start > now);
  const isStaff = viewer.role === 'STAFF';
  return {
    id: c.id,
    businessId: c.businessId,
    name: c.name,
    phone: isStaff ? undefined : c.phone,
    email: isStaff ? undefined : c.email,
    notes: c.notes,
    createdAt: c.createdAt,
    appointmentCount: mine.length,
    lastAppointmentAt: past.at(-1)?.start,
    nextAppointmentAt: future[0]?.start,
  };
}

function cancellationOut(r: CancellationRecord, viewer: User): CancellationRequest {
  const a = data().appointments.find((x) => x.id === r.appointmentId)!;
  return {
    id: r.id,
    appointment: hydrate(a, viewer),
    requestedAt: r.requestedAt,
    reason: r.reason,
    channel: r.channel,
    status: r.status,
    resolvedAt: r.resolvedAt,
    resolvedBy: r.resolvedBy,
  };
}

function logActivity(businessId: string, entry: Omit<Db['activity'][number], 'id' | 'businessId' | 'createdAt'>) {
  data().activity.unshift({ id: nextId('ac'), businessId, createdAt: nowIso(), ...entry });
}

function computeSlots(
  business: Business,
  serviceId: string,
  date: string,
  staffId?: string,
  excludeAppointmentId?: string,
): Slot[] {
  const d = data();
  const service = findIn(d.services, serviceId, business.id, 'Service');
  const tz = business.timeZone;
  const candidates = d.staff.filter(
    (s) => s.businessId === business.id && s.active && s.serviceIds.includes(service.id) && (!staffId || s.id === staffId),
  );
  const earliest = Date.now() + 15 * 60_000;
  const slots: Slot[] = [];

  for (const s of candidates) {
    const hours = s.workingHours[weekdayOf(date)];
    if (!hours) continue;
    const blocked: { start: string; end: string }[] = d.appointments
      .filter((a) => a.staffId === s.id && a.status !== 'CANCELLED' && a.id !== excludeAppointmentId)
      .map((a) => ({ start: a.start, end: a.end }));
    if (s.breakTime) {
      blocked.push({
        start: zonedToUtc(date, s.breakTime.start, tz).toISOString(),
        end: zonedToUtc(date, s.breakTime.end, tz).toISOString(),
      });
    }
    for (const u of s.unavailable.filter((x) => x.date === date)) {
      blocked.push({ start: zonedToUtc(date, u.start, tz).toISOString(), end: zonedToUtc(date, u.end, tz).toISOString() });
    }
    const close = timeToMinutes(hours.close);
    for (let t = timeToMinutes(hours.open); t + service.durationMin <= close; t += SLOT_STEP_MIN) {
      const start = zonedToUtc(date, minutesToTime(t), tz);
      if (start.getTime() < earliest) continue;
      const slot = {
        start: start.toISOString(),
        end: new Date(start.getTime() + service.durationMin * 60_000).toISOString(),
      };
      if (blocked.some((b) => overlaps(slot, b))) continue;
      slots.push({ ...slot, staffId: s.id, staffName: s.name });
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start) || a.staffName.localeCompare(b.staffName));
}

function assertSlotFree(business: Business, serviceId: string, staffId: string, start: string, excludeId?: string) {
  const date = dateKey(start, business.timeZone);
  const free = computeSlots(business, serviceId, date, staffId, excludeId);
  if (!free.some((s) => s.start === new Date(start).toISOString())) {
    fail(409, 'SLOT_UNAVAILABLE', 'That time is no longer available. Pick another slot.');
  }
}

function filterAppointments(list: AppointmentRecord[], q: AppointmentQuery, tz: string): AppointmentRecord[] {
  const d = data();
  const search = q.search?.trim().toLowerCase();
  let out = list.filter((a) => {
    if (q.from && a.end <= q.from) return false;
    if (q.to && a.start >= q.to) return false;
    if (q.status?.length && !q.status.includes(a.status)) return false;
    if (q.staffId && a.staffId !== q.staffId) return false;
    if (q.serviceId && a.serviceId !== q.serviceId) return false;
    if (q.customerId && a.customerId !== q.customerId) return false;
    if (search) {
      const c = d.customers.find((x) => x.id === a.customerId)!;
      const svc = d.services.find((x) => x.id === a.serviceId)!;
      const hay = `${c.name} ${c.phone.replace(/\s/g, '')} ${svc.name}`.toLowerCase();
      if (!hay.includes(search.replace(/\s/g, '')) && !hay.includes(search)) return false;
    }
    return true;
  });
  out = out.sort((x, y) => (q.sort === 'desc' ? y.start.localeCompare(x.start) : x.start.localeCompare(y.start)));
  void tz;
  return q.limit ? out.slice(0, q.limit) : out;
}

function computeAnalytics(business: Business, from: string, to: string): Analytics {
  const d = data();
  const tz = business.timeZone;
  const days = diffDays(from, to) + 1;
  const inRange = (a: AppointmentRecord, f: string, t: string) => {
    const k = dateKey(a.start, tz);
    return k >= f && k <= t;
  };
  const all = d.appointments.filter((a) => a.businessId === business.id);
  const current = all.filter((a) => inRange(a, from, to));
  const prevFrom = addDays(from, -days);
  const prevTo = addDays(from, -1);
  const previous = all.filter((a) => inRange(a, prevFrom, prevTo));
  const earns = (a: AppointmentRecord) => a.status === 'COMPLETED' || a.status === 'CONFIRMED';
  const sum = (xs: AppointmentRecord[]) => xs.filter(earns).reduce((t, a) => t + a.price, 0);
  const rate = (xs: AppointmentRecord[]) => (xs.length ? xs.filter((a) => a.status === 'CANCELLED').length / xs.length : 0);

  const daily = Array.from({ length: days }, (_, i) => {
    const key = addDays(from, i);
    const dayAppts = current.filter((a) => dateKey(a.start, tz) === key);
    return {
      date: key,
      booked: dayAppts.filter((a) => a.status !== 'CANCELLED').length,
      cancelled: dayAppts.filter((a) => a.status === 'CANCELLED').length,
      revenue: sum(dayAppts),
    };
  });

  const services = d.services
    .filter((s) => s.businessId === business.id)
    .map((s) => {
      const xs = current.filter((a) => a.serviceId === s.id && a.status !== 'CANCELLED');
      return { serviceId: s.id, name: s.name, count: xs.length, revenue: sum(xs) };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const staff = d.staff
    .filter((s) => s.businessId === business.id)
    .map((s) => {
      const xs = current.filter((a) => a.staffId === s.id);
      let available = 0;
      for (let i = 0; i < days; i++) {
        const h = s.workingHours[weekdayOf(addDays(from, i))];
        if (h) available += timeToMinutes(h.close) - timeToMinutes(h.open);
      }
      const booked = xs
        .filter((a) => a.status !== 'CANCELLED')
        .reduce((t, a) => t + (new Date(a.end).getTime() - new Date(a.start).getTime()) / 60_000, 0);
      return {
        staffId: s.id,
        name: s.name,
        title: s.title,
        count: xs.filter((a) => a.status !== 'CANCELLED').length,
        revenue: sum(xs),
        cancellationRate: rate(xs),
        utilisation: available ? Math.min(1, booked / available) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    from,
    to,
    appointments: current.length,
    confirmed: current.filter(earns).length,
    cancellations: current.filter((a) => a.status === 'CANCELLED').length,
    cancellationRate: rate(current),
    revenue: sum(current),
    previous: { appointments: previous.length, revenue: sum(previous), cancellationRate: rate(previous) },
    daily,
    services,
    staff,
  };
}

function requireText(fields: Record<string, string | undefined>) {
  const errors: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) if (!v?.trim()) errors[k] = 'This field is required.';
  if (Object.keys(errors).length) fail(422, 'VALIDATION', 'Please fix the highlighted fields.', errors);
}

export const mockApi: VoxDeskApi = {
  auth: {
    async getSession() {
      const id = readSessionUserId();
      const user = data().users.find((u) => u.id === id);
      if (!user) return delay(null, 120);
      return delay({ user, business: data().businesses.find((b) => b.id === user.businessId)! }, 120);
    },
    async login(email, password) {
      await delay(null);
      const user = data().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || password !== (passwords.get(user.id) ?? DEMO_PASSWORD)) fail(401, 'UNAUTHENTICATED', 'Email or password is incorrect.');
      sessionStorage.setItem(SESSION_KEY, user.id);
      return delay({ user, business: data().businesses.find((b) => b.id === user.businessId)! }, 0);
    },
    async logout() {
      sessionStorage.removeItem(SESSION_KEY);
      return delay(undefined, 100);
    },
    async changePassword(current, next) {
      const { user } = ctx();
      if (current !== (passwords.get(user.id) ?? DEMO_PASSWORD)) fail(422, 'VALIDATION', 'Your current password is not correct.', { current: 'Not correct.' });
      if (next.length < 8) fail(422, 'VALIDATION', 'Use at least 8 characters.', { next: 'Use at least 8 characters.' });
      passwords.set(user.id, next);
      return delay(undefined, 500);
    },
  },

  business: {
    async update(patch) {
      const { business } = ctx('OWNER');
      if (patch.name !== undefined) requireText({ name: patch.name });
      if (patch.timeZone) {
        try {
          new Intl.DateTimeFormat('en', { timeZone: patch.timeZone });
        } catch {
          fail(422, 'VALIDATION', 'Unknown time zone.', { timeZone: 'Unknown time zone.' });
        }
      }
      if (patch.currency) {
        try {
          new Intl.NumberFormat('en', { style: 'currency', currency: patch.currency });
        } catch {
          fail(422, 'VALIDATION', 'Unknown currency code.', { currency: 'Use a three-letter code such as PKR.' });
        }
      }
      Object.assign(business, patch);
      return delay(business);
    },
  },

  appointments: {
    async list(q) {
      const { user, business } = ctx();
      return delay(filterAppointments(visibleAppointments(user), q, business.timeZone).map((a) => hydrate(a, user)));
    },
    async get(id) {
      const { user } = ctx();
      const a = visibleAppointments(user).find((x) => x.id === id);
      if (!a) fail(404, 'NOT_FOUND', 'Appointment not found.');
      return delay(hydrate(a, user));
    },
    async availability(q) {
      const { business } = ctx('OWNER', 'RECEPTIONIST');
      return delay(computeSlots(business, q.serviceId, q.date, q.staffId, q.excludeAppointmentId), 350);
    },
    async create(input) {
      const { user, business } = ctx('OWNER', 'RECEPTIONIST');
      await delay(null, 600);
      const existing = idempotency.get(input.idempotencyKey);
      if (existing) return delay(hydrate(data().appointments.find((a) => a.id === existing)!, user), 0);
      const d = data();
      findIn(d.customers, input.customerId, business.id, 'Customer');
      const service = findIn(d.services, input.serviceId, business.id, 'Service');
      const staff = findIn(d.staff, input.staffId, business.id, 'Staff member');
      if (!staff.serviceIds.includes(service.id)) fail(422, 'VALIDATION', `${staff.name} does not offer ${service.name}.`);
      assertSlotFree(business, service.id, staff.id, input.start);
      const start = new Date(input.start);
      const record: AppointmentRecord = {
        id: nextId('ap'),
        businessId: business.id,
        customerId: input.customerId,
        staffId: staff.id,
        serviceId: service.id,
        start: start.toISOString(),
        end: new Date(start.getTime() + service.durationMin * 60_000).toISOString(),
        status: 'CONFIRMED',
        source: user.role === 'OWNER' ? 'OWNER' : 'RECEPTION',
        price: service.price,
        notes: input.notes?.trim() || undefined,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      d.appointments.push(record);
      idempotency.set(input.idempotencyKey, record.id);
      const customer = d.customers.find((c) => c.id === input.customerId)!;
      logActivity(business.id, {
        kind: 'BOOKED',
        actor: user.role === 'OWNER' ? 'OWNER' : 'RECEPTION',
        actorName: user.name,
        text: `Booked: ${service.name} with ${staff.name.split(' ')[0]} for ${customer.name}`,
      });
      return delay(hydrate(record, user), 0);
    },
    async reschedule(id, input) {
      const { user, business } = ctx('OWNER', 'RECEPTIONIST');
      await delay(null, 500);
      const a = findIn(data().appointments, id, business.id, 'Appointment');
      const key = `reschedule:${input.idempotencyKey}`;
      if (idempotency.has(key)) return delay(hydrate(a, user), 0);
      if (a.status !== 'PENDING' && a.status !== 'CONFIRMED') fail(409, 'CONFLICT', 'Only upcoming appointments can be moved.');
      const staff = findIn(data().staff, input.staffId, business.id, 'Staff member');
      if (!staff.serviceIds.includes(a.serviceId)) fail(422, 'VALIDATION', `${staff.name} does not offer this service.`);
      assertSlotFree(business, a.serviceId, staff.id, input.start, a.id);
      const duration = new Date(a.end).getTime() - new Date(a.start).getTime();
      const start = new Date(input.start);
      a.start = start.toISOString();
      a.end = new Date(start.getTime() + duration).toISOString();
      a.staffId = staff.id;
      a.status = 'CONFIRMED';
      a.updatedAt = nowIso();
      idempotency.set(key, a.id);
      const customer = data().customers.find((c) => c.id === a.customerId)!;
      logActivity(business.id, { kind: 'RESCHEDULED', actor: user.role === 'OWNER' ? 'OWNER' : 'RECEPTION', actorName: user.name, text: `Moved: ${customer.name} to a new time` });
      return delay(hydrate(a, user), 0);
    },
    async cancel(id, reason) {
      const { user, business } = ctx('OWNER', 'RECEPTIONIST');
      const a = findIn(data().appointments, id, business.id, 'Appointment');
      if (a.status !== 'PENDING' && a.status !== 'CONFIRMED') fail(409, 'CONFLICT', 'This appointment can no longer be cancelled.');
      a.status = 'CANCELLED';
      a.cancelRequested = false;
      a.notes = reason.trim() ? `Cancelled: ${reason.trim()}` : a.notes;
      a.updatedAt = nowIso();
      for (const r of data().cancellations) {
        if (r.appointmentId === a.id && r.status === 'OPEN') {
          r.status = 'APPROVED';
          r.resolvedAt = nowIso();
          r.resolvedBy = user.name;
        }
      }
      const customer = data().customers.find((c) => c.id === a.customerId)!;
      logActivity(business.id, { kind: 'CANCELLED', actor: user.role === 'OWNER' ? 'OWNER' : 'RECEPTION', actorName: user.name, text: `Cancelled: appointment for ${customer.name}` });
      return delay(hydrate(a, user));
    },
    async setStatus(id, status) {
      const { user, business } = ctx('OWNER', 'RECEPTIONIST');
      const a = findIn(data().appointments, id, business.id, 'Appointment');
      if (status === 'CONFIRMED' && a.status !== 'PENDING') fail(409, 'CONFLICT', 'Only pending appointments can be confirmed.');
      if (status !== 'CONFIRMED') {
        if (a.status !== 'CONFIRMED' && a.status !== 'PENDING') fail(409, 'CONFLICT', 'This appointment can no longer be updated.');
        if (new Date(a.start) > new Date()) fail(409, 'CONFLICT', 'This appointment has not started yet.');
      }
      a.status = status;
      a.updatedAt = nowIso();
      return delay(hydrate(a, user));
    },
  },

  customers: {
    async list(q) {
      const { user, business } = ctx();
      const search = q.search?.trim().toLowerCase().replace(/\s/g, '');
      let list = data().customers.filter((c) => c.businessId === business.id);
      if (user.role === 'STAFF') {
        const mine = new Set(visibleAppointments(user).map((a) => a.customerId));
        list = list.filter((c) => mine.has(c.id));
      }
      if (search) {
        list = list.filter((c) =>
          (c.name.toLowerCase().replace(/\s/g, '') + (user.role === 'STAFF' ? '' : c.phone.replace(/\s/g, ''))).includes(search),
        );
      }
      return delay(list.map((c) => customerOut(c, user)).sort((a, b) => a.name.localeCompare(b.name)));
    },
    async get(id) {
      const { user, business } = ctx();
      const c = findIn(data().customers, id, business.id, 'Customer');
      if (user.role === 'STAFF' && !visibleAppointments(user).some((a) => a.customerId === id)) fail(404, 'NOT_FOUND', 'Customer not found.');
      return delay(customerOut(c, user));
    },
    async history(id) {
      const { user } = ctx();
      const list = visibleAppointments(user)
        .filter((a) => a.customerId === id)
        .sort((x, y) => y.start.localeCompare(x.start));
      return delay(list.map((a) => hydrate(a, user)));
    },
    async create(input) {
      const { user, business } = ctx('OWNER', 'RECEPTIONIST');
      requireText({ name: input.name, phone: input.phone });
      const digits = input.phone.replace(/\D/g, '');
      if (digits.length < 10) fail(422, 'VALIDATION', 'Please fix the highlighted fields.', { phone: 'Enter a full phone number.' });
      if (data().customers.some((c) => c.businessId === business.id && c.phone.replace(/\D/g, '') === digits)) {
        fail(409, 'CONFLICT', 'A customer with this phone number already exists.', { phone: 'Already used by another customer.' });
      }
      const record: CustomerRecord = {
        id: nextId('cu'),
        businessId: business.id,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        createdAt: nowIso(),
      };
      data().customers.push(record);
      return delay(customerOut(record, user));
    },
    async update(id, patch) {
      const { user, business } = ctx('OWNER', 'RECEPTIONIST');
      const c = findIn(data().customers, id, business.id, 'Customer');
      if (patch.name !== undefined) requireText({ name: patch.name });
      Object.assign(c, patch);
      return delay(customerOut(c, user));
    },
  },

  staff: {
    async list() {
      const { business } = ctx('OWNER', 'RECEPTIONIST');
      return delay(data().staff.filter((s) => s.businessId === business.id).map((s) => staffOut(s, business.timeZone)));
    },
    async create(input) {
      const { business } = ctx('OWNER');
      requireText({ name: input.name, title: input.title, phone: input.phone });
      const record: StaffRecord = { id: nextId('st'), businessId: business.id, active: true, breakTime: null, unavailable: [], ...input };
      data().staff.push(record);
      for (const s of data().services) {
        if (s.businessId === business.id && input.serviceIds.includes(s.id) && !s.staffIds.includes(record.id)) s.staffIds.push(record.id);
      }
      return delay(staffOut(record, business.timeZone));
    },
    async update(id, patch) {
      const { business } = ctx('OWNER');
      const s = findIn(data().staff, id, business.id, 'Staff member');
      if (patch.name !== undefined) requireText({ name: patch.name });
      Object.assign(s, patch);
      if (patch.serviceIds) {
        for (const svc of data().services.filter((x) => x.businessId === business.id)) {
          const has = svc.staffIds.includes(id);
          const wants = patch.serviceIds.includes(svc.id);
          if (wants && !has) svc.staffIds.push(id);
          if (!wants && has) svc.staffIds = svc.staffIds.filter((x) => x !== id);
        }
      }
      return delay(staffOut(s, business.timeZone));
    },
    async setActive(id, active) {
      const { business } = ctx('OWNER');
      const s = findIn(data().staff, id, business.id, 'Staff member');
      s.active = active;
      return delay(staffOut(s, business.timeZone));
    },
  },

  services: {
    async list() {
      const { business } = ctx();
      return delay(data().services.filter((s) => s.businessId === business.id));
    },
    async create(input) {
      const { business } = ctx('OWNER');
      if (business.plan !== 'PRO') fail(402, 'PLAN_REQUIRED', 'Services and pricing need the Pro plan.');
      requireText({ name: input.name });
      if (input.durationMin <= 0) fail(422, 'VALIDATION', 'Please fix the highlighted fields.', { durationMin: 'Enter a duration.' });
      const record = { id: nextId('svc'), businessId: business.id, ...input };
      data().services.push(record);
      for (const s of data().staff) {
        if (input.staffIds.includes(s.id) && !s.serviceIds.includes(record.id)) s.serviceIds.push(record.id);
      }
      return delay(record);
    },
    async update(id, patch) {
      const { business } = ctx('OWNER');
      if (business.plan !== 'PRO') fail(402, 'PLAN_REQUIRED', 'Services and pricing need the Pro plan.');
      const svc = findIn(data().services, id, business.id, 'Service');
      if (patch.name !== undefined) requireText({ name: patch.name });
      Object.assign(svc, patch);
      if (patch.staffIds) {
        for (const s of data().staff.filter((x) => x.businessId === business.id)) {
          const has = s.serviceIds.includes(id);
          const wants = patch.staffIds.includes(s.id);
          if (wants && !has) s.serviceIds.push(id);
          if (!wants && has) s.serviceIds = s.serviceIds.filter((x) => x !== id);
        }
      }
      return delay(svc);
    },
  },

  cancellations: {
    async list(status) {
      const { user, business } = ctx('OWNER', 'RECEPTIONIST');
      const list = data()
        .cancellations.filter((r) => r.businessId === business.id && (!status || r.status === status))
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
      return delay(list.map((r) => cancellationOut(r, user)));
    },
    async approve(id) {
      const { user, business } = ctx('OWNER', 'RECEPTIONIST');
      const r = findIn(data().cancellations, id, business.id, 'Request');
      if (r.status !== 'OPEN') fail(409, 'CONFLICT', 'This request has already been handled.');
      const a = data().appointments.find((x) => x.id === r.appointmentId)!;
      a.status = 'CANCELLED';
      a.cancelRequested = false;
      a.updatedAt = nowIso();
      r.status = 'APPROVED';
      r.resolvedAt = nowIso();
      r.resolvedBy = user.name;
      const customer = data().customers.find((c) => c.id === a.customerId)!;
      logActivity(business.id, { kind: 'CANCELLED', actor: user.role === 'OWNER' ? 'OWNER' : 'RECEPTION', actorName: user.name, text: `Cancelled at the customer’s request: ${customer.name}` });
      return delay(cancellationOut(r, user));
    },
    async retain(id, note) {
      const { user, business } = ctx('OWNER', 'RECEPTIONIST');
      if (!business.cancellationPolicy.allowRetain) fail(403, 'FORBIDDEN', 'Your cancellation policy does not allow keeping a booking after a request.');
      const r = findIn(data().cancellations, id, business.id, 'Request');
      if (r.status !== 'OPEN') fail(409, 'CONFLICT', 'This request has already been handled.');
      const a = data().appointments.find((x) => x.id === r.appointmentId)!;
      a.cancelRequested = false;
      a.notes = note.trim() ? `Kept after cancellation request: ${note.trim()}` : a.notes;
      a.updatedAt = nowIso();
      r.status = 'RETAINED';
      r.resolvedAt = nowIso();
      r.resolvedBy = user.name;
      return delay(cancellationOut(r, user));
    },
  },

  analytics: {
    async get(range) {
      const { business } = ctx('OWNER');
      return delay(computeAnalytics(business, range.from, range.to), 400);
    },
  },

  activity: {
    async list(limit) {
      const { business } = ctx('OWNER', 'RECEPTIONIST');
      return delay(data().activity.filter((a) => a.businessId === business.id).slice(0, limit));
    },
  },

  notifications: {
    async list() {
      const { user } = ctx();
      return delay(data().notifications.filter((n) => n.userId === user.id), 150);
    },
    async markAllRead() {
      const { user } = ctx();
      data().notifications.forEach((n) => {
        if (n.userId === user.id) n.read = true;
      });
      return delay(undefined, 100);
    },
  },

  receptionist: {
    async get() {
      const { business } = ctx('OWNER');
      return delay(data().receptionist[business.id]!);
    },
    async update(config) {
      const { business } = ctx('OWNER');
      requireText({ name: config.name, greeting: config.greeting });
      if (!config.languages.length) fail(422, 'VALIDATION', 'Choose at least one language.', { languages: 'Choose at least one language.' });
      data().receptionist[business.id] = config;
      business.receptionistActive = config.active;
      return delay(config);
    },
    async test(message) {
      const { business } = ctx('OWNER');
      const cfg = data().receptionist[business.id]!;
      const m = message.toLowerCase();
      const faq = cfg.faqs.find((f) => f.question.toLowerCase().split(/\W+/).filter((w) => w.length > 4).some((w) => m.includes(w)));
      let intent = 'GENERAL';
      let reply = `I can help with bookings, changes and questions about ${business.name}. What would you like to do?`;
      if (!cfg.active) {
        intent = 'PAUSED';
        reply = 'The receptionist is paused, so calls go straight to your transfer number.';
      } else if (/book|appointment|slot|available/.test(m)) {
        intent = 'BOOK';
        reply = cfg.booking.allowBooking
          ? 'Of course. Which service would you like, and do you have a preferred stylist? I will check what is free before booking anything.'
          : 'I can take your details and someone from the salon will call you back to book.';
      } else if (/cancel/.test(m)) {
        intent = 'CANCEL';
        reply = cfg.cancellation.sendToReception
          ? 'I can pass your cancellation request to reception. Could you tell me the name the booking is under?'
          : 'I can cancel that for you. Could you tell me the name the booking is under?';
      } else if (/manager|person|human|complain/.test(m)) {
        intent = 'TRANSFER';
        reply = `Let me connect you to the salon now on ${cfg.escalation.transferNumber}.`;
      } else if (faq) {
        intent = 'FAQ';
        reply = faq.answer;
      }
      return delay({ reply, intent, note: 'Demo reply worked out in your browser. Live calls are answered by the VoxDesk voice service.' }, 700);
    },
  },

  integrations: {
    async list() {
      const { business } = ctx('OWNER');
      return delay(data().integrations[business.id] ?? []);
    },
    async connect(id) {
      const { business } = ctx('OWNER');
      await delay(null, 900);
      const item = (data().integrations[business.id] ?? []).find((i) => i.id === id);
      if (!item) fail(404, 'NOT_FOUND', 'Integration not found.');
      Object.assign(item, { status: 'CONNECTED', account: business.email, lastSyncAt: nowIso(), error: undefined });
      return delay(item, 0);
    },
    async disconnect(id) {
      const { business } = ctx('OWNER');
      const item = (data().integrations[business.id] ?? []).find((i) => i.id === id);
      if (!item) fail(404, 'NOT_FOUND', 'Integration not found.');
      Object.assign(item, { status: 'DISCONNECTED', account: undefined, lastSyncAt: undefined, error: undefined });
      return delay(item);
    },
  },

  me: {
    async schedule(from, to) {
      const { user, business } = ctx('STAFF');
      const s = data().staff.find((x) => x.id === user.staffId)!;
      const tz = business.timeZone;
      const count = diffDays(from, to) + 1;
      const days = Array.from({ length: count }, (_, i) => {
        const date = addDays(from, i);
        const h = s.workingHours[weekdayOf(date)];
        const at = (t: string) => zonedToUtc(date, t, tz).toISOString();
        return {
          date,
          hours: h ? { start: at(h.open), end: at(h.close) } : null,
          breaks: h && s.breakTime ? [{ start: at(s.breakTime.start), end: at(s.breakTime.end), label: 'Break' }] : [],
          unavailable: s.unavailable.filter((u) => u.date === date).map((u) => ({ start: at(u.start), end: at(u.end), label: u.label })),
        };
      });
      const fromIso = zonedToUtc(from, '00:00', tz).toISOString();
      const toIso = zonedToUtc(addDays(to, 1), '00:00', tz).toISOString();
      const appts = filterAppointments(visibleAppointments(user), { from: fromIso, to: toIso }, tz).map((a) => hydrate(a, user));
      return delay({ staffId: s.id, days, appointments: appts });
    },
    async profile() {
      const { user, business } = ctx('STAFF');
      const s = data().staff.find((x) => x.id === user.staffId)!;
      return delay({
        user,
        staff: staffOut(s, business.timeZone),
        services: data().services.filter((x) => s.serviceIds.includes(x.id)),
        notifications: staffPrefs.get(user.id) ?? business.notifications,
      });
    },
    async updateProfile(patch) {
      const { user, business } = ctx('STAFF');
      const s = data().staff.find((x) => x.id === user.staffId)!;
      if (patch.notifications) staffPrefs.set(user.id, patch.notifications);
      if (patch.phone !== undefined) {
        requireText({ phone: patch.phone });
        user.phone = patch.phone;
        s.phone = patch.phone;
      }
      if (patch.email !== undefined) {
        requireText({ email: patch.email });
        user.email = patch.email;
        s.email = patch.email;
      }
      return delay({
        user,
        staff: staffOut(s, business.timeZone),
        services: data().services.filter((x) => s.serviceIds.includes(x.id)),
        notifications: staffPrefs.get(user.id) ?? business.notifications,
      });
    },
  },
};
