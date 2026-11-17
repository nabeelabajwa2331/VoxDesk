// Exercises the demo API (src/mocks) end to end: roles, tenant isolation,
// availability, idempotent bookings, cancellations and Stripe billing states.
// Run with: pnpm check:mock
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));

const store = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const server = await createServer({ root, configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { mockApi: api, demoStripe } = await server.ssrLoadModule('/src/mocks/mockApi.ts');
const { createFormatter } = await server.ssrLoadModule('/src/lib/format.ts');
const time = await server.ssrLoadModule('/src/lib/time.ts');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok  ', msg); } else { fail++; console.log('  FAIL', msg); } };
const code = async (p) => { try { await p; return 'NO_ERROR'; } catch (e) { return e.code ?? e.message; } };

const tz = 'Asia/Karachi';
const fmt = createFormatter({ timeZone: tz, currency: 'PKR', locale: 'en-PK', dateFormat: 'medium' });
console.log('format:', fmt.money(486500), '|', fmt.time('2026-11-17T10:30:00Z'), '|', fmt.date('2026-11-17T10:30:00Z'), '|', fmt.duration(135));
ok(fmt.money(1500).startsWith('Rs'), 'money uses Rs');
ok(fmt.time('2026-11-17T10:30:00Z') === '3:30 PM', '12-hour time in business zone');
ok(time.zonedToUtc('2026-11-17', '15:30', tz).toISOString() === '2026-11-17T10:30:00.000Z', 'zonedToUtc Karachi');

console.log('auth');
ok((await code(api.auth.login('sara@maisonstudio.pk', 'wrong'))) === 'UNAUTHENTICATED', 'wrong password rejected');
ok((await code(api.appointments.list({}))) === 'UNAUTHENTICATED', 'no session -> 401');

console.log('reception');
await api.auth.login('nida@maisonstudio.pk', 'demo1234');
ok((await code(api.analytics.get({ from: '2026-11-01', to: '2026-11-17' }))) === 'FORBIDDEN', 'reception cannot read analytics');
ok((await code(api.receptionist.get())) === 'FORBIDDEN', 'reception cannot read AI config');
ok((await code(api.billing.subscription())) === 'FORBIDDEN', 'reception cannot see billing');
ok((await code(api.staff.create({ name: 'x', title: 'x', phone: '03001234567', email: '', serviceIds: [], workingHours: [] }))) === 'FORBIDDEN', 'reception cannot add staff');
const all = await api.appointments.list({});
ok(all.length > 100 && all.every((a) => a.businessId === 'biz-maison'), `reception sees ${all.length} Maison appointments only`);
ok(all.some((a) => a.customerPhone), 'reception sees phone numbers');

const today = time.todayKey(tz);
const date = time.addDays(today, 2);
let slots = [];
let day = date;
for (let i = 0; i < 6 && !slots.length; i++) { day = time.addDays(date, i); slots = await api.appointments.availability({ serviceId: 'svc-cut', date: day }); }
ok(slots.length > 0, `availability returns ${slots.length} haircut slots on ${day}`);
const slot = slots[0];
const customers = await api.customers.list({ search: 'mahnoor' });
ok(customers.length === 1, 'customer search by name');
const key = 'test-key-1';
const [b1, b2] = await Promise.all([
  api.appointments.create({ customerId: customers[0].id, serviceId: 'svc-cut', staffId: slot.staffId, start: slot.start, idempotencyKey: key }),
  api.appointments.create({ customerId: customers[0].id, serviceId: 'svc-cut', staffId: slot.staffId, start: slot.start, idempotencyKey: key }).catch((e) => e),
]);
ok(b1.status === 'CONFIRMED', 'booking confirmed by API');
ok(b2.id === b1.id || b2.code === 'SLOT_UNAVAILABLE', 'same idempotency key does not create a second booking');
const dupCount = (await api.appointments.list({ staffId: slot.staffId })).filter((a) => a.start === slot.start && a.status !== 'CANCELLED').length;
ok(dupCount === 1, 'exactly one appointment in that slot');
ok((await code(api.appointments.create({ customerId: customers[0].id, serviceId: 'svc-cut', staffId: slot.staffId, start: slot.start, idempotencyKey: 'other' }))) === 'SLOT_UNAVAILABLE', 'second booking of same slot -> SLOT_UNAVAILABLE');
const after = await api.appointments.availability({ serviceId: 'svc-cut', date: day, staffId: slot.staffId });
ok(!after.some((s) => s.start === slot.start), 'booked slot no longer offered');
ok((await code(api.appointments.create({ customerId: customers[0].id, serviceId: 'svc-balayage', staffId: 'st-bilal', start: slot.start, idempotencyKey: 'k3' }))) === 'VALIDATION', 'staff who does not offer a service cannot be booked for it');

const moveTo = after.find((s) => s.start > slot.start);
const moved = await api.appointments.reschedule(b1.id, { start: moveTo.start, staffId: moveTo.staffId, idempotencyKey: 'r1' });
ok(moved.start === moveTo.start, 'reschedule moves the booking');
const freed = await api.appointments.availability({ serviceId: 'svc-cut', date: day, staffId: slot.staffId });
ok(freed.some((s) => s.start === slot.start), 'old slot is free again after reschedule');
const cancelled = await api.appointments.cancel(b1.id, 'test');
ok(cancelled.status === 'CANCELLED', 'cancel works');
ok((await code(api.appointments.cancel(b1.id, 'again'))) === 'CONFLICT', 'cannot cancel twice');

const open = await api.cancellations.list('OPEN');
ok(open.length === 2, `${open.length} open cancellation requests`);
const kept = await api.cancellations.retain(open[0].id, 'agreed');
ok(kept.status === 'RETAINED' && !kept.appointment.cancelRequested, 'retain keeps the booking');
const approved = await api.cancellations.approve(open[1].id);
ok(approved.status === 'APPROVED' && approved.appointment.status === 'CANCELLED', 'approve cancels the booking');
ok((await code(api.cancellations.approve(open[1].id))) === 'CONFLICT', 'request cannot be handled twice');

console.log('staff');
await api.auth.logout();
await api.auth.login('ayesha@maisonstudio.pk', 'demo1234');
const mine = await api.appointments.list({});
ok(mine.length > 0 && mine.every((a) => a.staffId === 'st-ayesha'), `staff sees only own ${mine.length} appointments`);
ok(mine.every((a) => a.customerPhone === undefined && a.price === undefined), 'staff gets no phone numbers or prices');
const myCustomers = await api.customers.list({});
ok(myCustomers.every((c) => c.phone === undefined), 'staff customers have no contact details');
const otherApptId = all.find((a) => a.staffId !== 'st-ayesha').id;
ok((await code(api.appointments.get(otherApptId))) === 'NOT_FOUND', 'staff cannot open another staff member’s appointment');
ok((await code(api.staff.list())) === 'FORBIDDEN', 'staff cannot list staff');
ok((await code(api.appointments.availability({ serviceId: 'svc-cut', date: day }))) === 'FORBIDDEN', 'staff cannot book');
const sched = await api.me.schedule(today, time.addDays(today, 6));
ok(sched.days.length === 7 && sched.appointments.every((a) => a.staffId === 'st-ayesha'), 'staff schedule is own week');

console.log('owner');
await api.auth.logout();
await api.auth.login('sara@maisonstudio.pk', 'demo1234');
const a = await api.analytics.get({ from: time.startOfMonth(today), to: today });
console.log(`  analytics: ${a.appointments} appts, revenue ${fmt.money(a.revenue)}, cancel rate ${fmt.percent(a.cancellationRate)}`);
ok(a.daily.length > 0 && a.staff.length === 4, 'analytics has daily and staff breakdown');
ok((await code(api.billing.createCheckout({ plan: 'PRO', returnPath: '/owner/settings' }))) === 'CONFLICT', 'Pro owner cannot start a second checkout');
const test = await api.receptionist.test('I want to book a haircut tomorrow');
ok(test.intent === 'BOOK', 'receptionist test detects booking intent');

console.log('free plan, other tenant');
await api.auth.logout();
await api.auth.login('omar@urbancuts.pk', 'demo1234');
ok((await code(api.services.create({ name: 'x', description: '', durationMin: 30, price: 1, staffIds: [], active: true }))) === 'PLAN_REQUIRED', 'Free plan cannot manage services');
const urban = await api.appointments.list({});
ok(urban.every((x) => x.businessId === 'biz-urban'), `tenant isolation: Urban Cuts sees ${urban.length} of its own only`);
ok((await code(api.appointments.get(all[0].id))) === 'NOT_FOUND', 'cannot open another business’s appointment');

console.log('stripe billing (demo)');
const before = await api.billing.subscription();
ok(before.plan === 'FREE' && !before.hasBillingAccount, 'Free owner starts with no subscription');
ok((await code(api.billing.createPortal('/owner/settings'))) === 'CONFLICT', 'no billing portal before first payment');
const { url } = await api.billing.createCheckout({ plan: 'PRO', returnPath: '/owner/settings' });
ok(url.startsWith('/demo-stripe?') && url.includes('mode=checkout'), 'checkout returns a hosted page URL');
const sessionId = new URLSearchParams(url.split('?')[1]).get('session');
await demoStripe.pay(sessionId);
ok((await api.billing.subscription()).plan === 'FREE', 'plan does not change at redirect time, only after the webhook');
await new Promise((r) => setTimeout(r, 3000));
const afterPay = await api.billing.subscription();
ok(afterPay.plan === 'PRO' && afterPay.status === 'ACTIVE', 'plan becomes Pro once the webhook lands');
ok((await code(api.services.create({ name: 'Fade', description: '', durationMin: 30, price: 1000, staffIds: [], active: true }))) === 'NO_ERROR', 'services unlock after upgrade');
ok((await api.billing.createPortal('/owner/settings')).url.includes('mode=portal'), 'billing portal available after payment');

console.log(`\n${pass} passed, ${fail} failed`);
await server.close();
process.exit(fail ? 1 : 0);
