import type {
  Activity,
  AppNotification,
  AppointmentStatus,
  BookingSource,
  Business,
  CancellationRequestStatus,
  Integration,
  ReceptionistConfig,
  Service,
  User,
  WeeklyHours,
} from '../types/domain';
import { addDays, timeToMinutes, todayKey, weekdayOf, zonedToUtc, minutesToTime } from '../lib/time';

export interface StaffRecord {
  id: string;
  businessId: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  active: boolean;
  serviceIds: string[];
  workingHours: WeeklyHours;
  breakTime: { start: string; end: string } | null;
  unavailable: { date: string; start: string; end: string; label: string }[];
}

export interface CustomerRecord {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export interface AppointmentRecord {
  id: string;
  businessId: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  source: BookingSource;
  price: number;
  notes?: string;
  cancelRequested?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CancellationRecord {
  id: string;
  businessId: string;
  appointmentId: string;
  requestedAt: string;
  reason?: string;
  channel: BookingSource;
  status: CancellationRequestStatus;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface Db {
  businesses: Business[];
  users: User[];
  staff: StaffRecord[];
  services: Service[];
  customers: CustomerRecord[];
  appointments: AppointmentRecord[];
  cancellations: CancellationRecord[];
  activity: (Activity & { businessId: string })[];
  notifications: (AppNotification & { userId: string })[];
  receptionist: Record<string, ReceptionistConfig>;
  integrations: Record<string, Integration[]>;
}

export const DEMO_PASSWORD = 'demo1234';

export const DEMO_ACCOUNTS = [
  { email: 'sara@maisonstudio.pk', name: 'Sara Malik', label: 'Owner, Maison Studio (Pro plan)' },
  { email: 'nida@maisonstudio.pk', name: 'Nida Hassan', label: 'Receptionist, Maison Studio' },
  { email: 'ayesha@maisonstudio.pk', name: 'Ayesha Rahman', label: 'Staff, senior stylist' },
  { email: 'bilal@maisonstudio.pk', name: 'Bilal Ahmed', label: 'Staff, barber' },
  { email: 'omar@urbancuts.pk', name: 'Omar Farooq', label: 'Owner, Urban Cuts (Free plan)' },
];

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hours = (open: string, close: string, closedDays: number[] = []): WeeklyHours =>
  Array.from({ length: 7 }, (_, d) => (closedDays.includes(d) ? null : { open, close }));

const TZ = 'Asia/Karachi';

function business(id: string, name: string, plan: Business['plan'], email: string, phone: string, address: string): Business {
  return {
    id,
    name,
    phone,
    email,
    address,
    timeZone: TZ,
    currency: 'PKR',
    locale: 'en-PK',
    dateFormat: 'medium',
    plan,
    workingHours: hours('10:00', '20:00'),
    cancellationPolicy: { noticeHours: null, allowRetain: true, note: '' },
    notifications: { newBooking: true, cancellation: true, dailySummary: false, channel: 'WHATSAPP' },
    receptionistActive: true,
  };
}

const CUSTOMER_NAMES = [
  'Mahnoor Ali', 'Zainab Qureshi', 'Rabia Anwar', 'Hamza Sheikh', 'Kiran Aslam', 'Fatima Khan',
  'Areeba Shah', 'Danish Malik', 'Iqra Javed', 'Saba Hussain', 'Noor Fatima', 'Usman Tariq',
  'Maryam Siddiqui', 'Ali Raza', 'Hania Butt', 'Sadia Noor', 'Mehwish Kamal', 'Hina Saeed',
  'Laiba Farooq', 'Amna Javaid', 'Bushra Iqbal', 'Taimur Khan', 'Sana Mirza', 'Zoya Ahmed',
];

const CUSTOMER_NOTES: Record<string, string> = {
  'Kiran Aslam': 'Prefers soft layers, shoulder length. Sensitive scalp: use the mild shampoo.',
  'Areeba Shah': 'Wants a shoulder-length cut and will bring a photo.',
  'Noor Fatima': 'Bridal trial for a wedding in December. Allow the full 2 hours.',
  'Iqra Javed': 'Allergic to some hair dyes. Patch test before colour.',
  'Hamza Sheikh': 'Short fade, number 2 on the sides.',
};

export function createSeed(): Db {
  const now = new Date();
  const today = todayKey(TZ);
  const iso = (key: string, time: string) => zonedToUtc(key, time, TZ).toISOString();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

  const businesses = [
    business('biz-maison', 'Maison Studio', 'PRO', 'hello@maisonstudio.pk', '042 3578 1100', '14-C Main Boulevard, Gulberg III, Lahore'),
    business('biz-urban', 'Urban Cuts', 'FREE', 'hello@urbancuts.pk', '021 3455 2200', 'Shop 7, Khayaban-e-Ittehad, DHA, Karachi'),
  ];

  const users: User[] = [
    { id: 'u-sara', businessId: 'biz-maison', name: 'Sara Malik', email: 'sara@maisonstudio.pk', phone: '0300 111 2233', role: 'OWNER' },
    { id: 'u-nida', businessId: 'biz-maison', name: 'Nida Hassan', email: 'nida@maisonstudio.pk', phone: '0301 222 3344', role: 'RECEPTIONIST' },
    { id: 'u-ayesha', businessId: 'biz-maison', name: 'Ayesha Rahman', email: 'ayesha@maisonstudio.pk', phone: '0302 333 4455', role: 'STAFF', staffId: 'st-ayesha' },
    { id: 'u-bilal', businessId: 'biz-maison', name: 'Bilal Ahmed', email: 'bilal@maisonstudio.pk', phone: '0303 444 5566', role: 'STAFF', staffId: 'st-bilal' },
    { id: 'u-omar', businessId: 'biz-urban', name: 'Omar Farooq', email: 'omar@urbancuts.pk', phone: '0321 555 6677', role: 'OWNER' },
  ];

  const svc = (id: string, businessId: string, name: string, description: string, durationMin: number, price: number, staffIds: string[]): Service => ({
    id, businessId, name, description, durationMin, price, staffIds, active: true,
  });

  const services: Service[] = [
    svc('svc-cut', 'biz-maison', 'Haircut', 'Wash, cut and finish.', 45, 2500, ['st-ayesha', 'st-bilal']),
    svc('svc-cutblow', 'biz-maison', 'Haircut and blow-dry', 'Cut with a full blow-dry and styling.', 60, 3500, ['st-ayesha']),
    svc('svc-blow', 'biz-maison', 'Blow-dry', 'Wash and blow-dry.', 30, 1500, ['st-ayesha', 'st-hira']),
    svc('svc-balayage', 'biz-maison', 'Balayage', 'Hand-painted highlights with toner.', 180, 18000, ['st-hira']),
    svc('svc-keratin', 'biz-maison', 'Keratin treatment', 'Smoothing treatment that lasts about three months.', 150, 15000, ['st-hira']),
    svc('svc-bridal', 'biz-maison', 'Bridal trial', 'Full trial of the wedding-day hair look.', 120, 12000, ['st-ayesha']),
    svc('svc-fade', 'biz-maison', 'Beard and fade', 'Skin or low fade with a beard shape-up.', 45, 2000, ['st-bilal']),
    svc('svc-mani', 'biz-maison', 'Gel manicure', 'Shape, cuticle care and gel colour.', 60, 3000, ['st-sana']),
    svc('svc-facial', 'biz-maison', 'Hydrating facial', 'Cleanse, exfoliate, mask and massage.', 60, 4500, ['st-sana']),
    svc('svc-brow', 'biz-maison', 'Eyebrow threading', 'Shape and tidy.', 15, 500, ['st-sana']),
    svc('svc-u-cut', 'biz-urban', 'Haircut', 'Classic cut and style.', 30, 1200, ['st-kamran', 'st-faisal']),
    svc('svc-u-beard', 'biz-urban', 'Beard trim', 'Trim and line-up.', 20, 600, ['st-kamran', 'st-faisal']),
  ];

  const staffRec = (
    id: string, businessId: string, name: string, title: string, phone: string, email: string,
    workingHours: WeeklyHours, breakTime: StaffRecord['breakTime'],
  ): StaffRecord => ({
    id, businessId, name, title, phone, email, active: true,
    serviceIds: services.filter((s) => s.staffIds.includes(id)).map((s) => s.id),
    workingHours, breakTime, unavailable: [],
  });

  const staff: StaffRecord[] = [
    staffRec('st-ayesha', 'biz-maison', 'Ayesha Rahman', 'Senior stylist', '0302 333 4455', 'ayesha@maisonstudio.pk', hours('10:00', '19:00', [0]), { start: '12:30', end: '13:15' }),
    staffRec('st-hira', 'biz-maison', 'Hira Batool', 'Colourist', '0304 555 6677', 'hira@maisonstudio.pk', hours('11:00', '20:00', [1]), { start: '14:00', end: '14:45' }),
    staffRec('st-bilal', 'biz-maison', 'Bilal Ahmed', 'Barber', '0303 444 5566', 'bilal@maisonstudio.pk', hours('10:00', '19:00', [0]), { start: '13:30', end: '14:15' }),
    staffRec('st-sana', 'biz-maison', 'Sana Iqbal', 'Nail and skin specialist', '0305 666 7788', 'sana@maisonstudio.pk', hours('11:00', '20:00', [2]), { start: '15:00', end: '15:30' }),
    staffRec('st-kamran', 'biz-urban', 'Kamran Ali', 'Barber', '0322 111 0099', 'kamran@urbancuts.pk', hours('10:00', '21:00', [5]), null),
    staffRec('st-faisal', 'biz-urban', 'Faisal Raza', 'Barber', '0323 222 0088', 'faisal@urbancuts.pk', hours('12:00', '22:00', [1]), null),
  ];
  const ayesha = staff[0]!;
  ayesha.unavailable.push({ date: addDays(today, 3), start: '15:00', end: '19:00', label: 'Training' });

  const random = rng(20261117);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(random() * xs.length)]!;

  const customers: CustomerRecord[] = [];
  CUSTOMER_NAMES.forEach((name, i) => {
    customers.push({
      id: `cu-${i + 1}`,
      businessId: 'biz-maison',
      name,
      phone: `03${String(Math.floor(random() * 50)).padStart(2, '0')} ${100 + Math.floor(random() * 899)} ${1000 + Math.floor(random() * 8999)}`,
      email: random() > 0.5 ? `${name.split(' ')[0]!.toLowerCase()}@example.com` : undefined,
      notes: CUSTOMER_NOTES[name],
      createdAt: iso(addDays(today, -120 + i * 3), '12:00'),
    });
  });
  ['Asad Mehmood', 'Junaid Akhtar', 'Shahzaib Khan', 'Rehan Ali'].forEach((name, i) => {
    customers.push({
      id: `cu-u-${i + 1}`,
      businessId: 'biz-urban',
      name,
      phone: `0333 ${200 + i * 37} ${4000 + i * 211}`,
      createdAt: iso(addDays(today, -60 + i), '12:00'),
    });
  });

  const appointments: AppointmentRecord[] = [];
  let seq = 1;
  const nowMs = now.getTime();

  for (let offset = -35; offset <= 14; offset++) {
    const day = addDays(today, offset);
    const wd = weekdayOf(day);
    for (const s of staff) {
      const h = s.workingHours[wd];
      if (!h) continue;
      const bizCustomers = customers.filter((c) => c.businessId === s.businessId);
      const bizServices = services.filter((x) => x.businessId === s.businessId && x.staffIds.includes(s.id));
      let cursor = timeToMinutes(h.open) + pick([0, 0, 15, 30, 60]);
      const close = timeToMinutes(h.close);
      const density = offset > 7 ? 0.35 : offset > 0 ? 0.6 : 0.75;
      while (cursor < close) {
        const service = pick(bizServices);
        const end = cursor + service.durationMin;
        const br = s.breakTime;
        if (br && cursor < timeToMinutes(br.end) && end > timeToMinutes(br.start)) {
          cursor = timeToMinutes(br.end);
          continue;
        }
        if (end > close) break;
        if (random() < density) {
          const startIso = iso(day, minutesToTime(cursor));
          const endIso = iso(day, minutesToTime(end));
          const startMs = new Date(startIso).getTime();
          let status: AppointmentStatus;
          const r = random();
          if (startMs < nowMs) status = r < 0.06 ? 'CANCELLED' : r < 0.08 ? 'NO_SHOW' : 'COMPLETED';
          else status = r < 0.04 ? 'CANCELLED' : r < 0.22 ? 'PENDING' : 'CONFIRMED';
          const src = random();
          const source: BookingSource = src < 0.45 ? 'AI_CALL' : src < 0.75 ? 'RECEPTION' : 'ONLINE';
          const created = new Date(Math.min(startMs, nowMs) - (1 + Math.floor(random() * 10)) * 86_400_000 + Math.floor(random() * 3600_000));
          appointments.push({
            id: `ap-${seq++}`,
            businessId: s.businessId,
            customerId: pick(bizCustomers).id,
            staffId: s.id,
            serviceId: service.id,
            start: startIso,
            end: endIso,
            status,
            source,
            price: service.price,
            createdAt: created.toISOString(),
            updatedAt: created.toISOString(),
          });
        }
        cursor = end + pick([0, 0, 15, 15, 30]);
      }
    }
  }

  const futureConfirmed = appointments.filter(
    (a) => a.businessId === 'biz-maison' && a.status === 'CONFIRMED' && new Date(a.start).getTime() > nowMs + 86_400_000,
  );
  const cancellations: CancellationRecord[] = [];
  const reasons = ['Something came up at work.', undefined, 'Travelling that week.'];
  futureConfirmed.slice(0, 3).forEach((a, i) => {
    const resolved = i === 2;
    if (!resolved) a.cancelRequested = true;
    a.customerId = ['cu-12', 'cu-16', 'cu-20'][i]!;
    cancellations.push({
      id: `cr-${i + 1}`,
      businessId: a.businessId,
      appointmentId: a.id,
      requestedAt: minutesAgo(resolved ? 60 * 26 : 38 + i * 80),
      reason: reasons[i],
      channel: i === 1 ? 'RECEPTION' : 'AI_CALL',
      status: resolved ? 'RETAINED' : 'OPEN',
      resolvedAt: resolved ? minutesAgo(60 * 24) : undefined,
      resolvedBy: resolved ? 'Nida Hassan' : undefined,
    });
  });

  const activity: Db['activity'] = [
    { id: 'ac-1', businessId: 'biz-maison', kind: 'BOOKED', actor: 'AI', text: 'Booked: Balayage with Hira for Hania Butt', createdAt: minutesAgo(12) },
    { id: 'ac-2', businessId: 'biz-maison', kind: 'CANCEL_REQUESTED', actor: 'AI', text: 'Usman Tariq asked to cancel a haircut', createdAt: minutesAgo(38) },
    { id: 'ac-3', businessId: 'biz-maison', kind: 'RESCHEDULED', actor: 'RECEPTION', actorName: 'Nida Hassan', text: 'Moved: Iqra Javed to a later slot today', createdAt: minutesAgo(64) },
    { id: 'ac-4', businessId: 'biz-maison', kind: 'TRANSFERRED', actor: 'AI', text: 'Call passed to reception: question about bridal packages', createdAt: minutesAgo(130) },
    { id: 'ac-5', businessId: 'biz-maison', kind: 'ANSWERED', actor: 'AI', text: 'Answered a question about keratin treatment prices', createdAt: minutesAgo(150) },
    { id: 'ac-6', businessId: 'biz-maison', kind: 'BOOKED', actor: 'ONLINE', text: 'Booked: Beard and fade with Bilal for Ali Raza', createdAt: minutesAgo(190) },
    { id: 'ac-7', businessId: 'biz-urban', kind: 'BOOKED', actor: 'AI', text: 'Booked: Haircut with Kamran for Asad Mehmood', createdAt: minutesAgo(25) },
  ];

  const notifications: Db['notifications'] = [
    { id: 'n-1', userId: 'u-sara', title: 'New booking from the AI receptionist', body: 'Balayage with Hira for Hania Butt.', createdAt: minutesAgo(12), read: false, href: '/owner/appointments' },
    { id: 'n-2', userId: 'u-sara', title: 'Cancellation request', body: 'Usman Tariq asked to cancel a haircut.', createdAt: minutesAgo(38), read: false },
    { id: 'n-3', userId: 'u-sara', title: 'Google Calendar synced', body: 'All appointments are up to date.', createdAt: minutesAgo(300), read: true, href: '/owner/integrations' },
    { id: 'n-4', userId: 'u-nida', title: 'Cancellation request', body: 'Usman Tariq asked to cancel a haircut.', createdAt: minutesAgo(38), read: false, href: '/reception/cancellations' },
    { id: 'n-5', userId: 'u-nida', title: 'Callback requested', body: 'Noor Fatima wants to discuss bridal packages.', createdAt: minutesAgo(130), read: false },
    { id: 'n-6', userId: 'u-ayesha', title: 'New booking', body: 'A haircut was booked with you for tomorrow.', createdAt: minutesAgo(90), read: false, href: '/staff/appointments' },
    { id: 'n-7', userId: 'u-omar', title: 'Welcome to VoxDesk AI', body: 'Connect Google Calendar to keep bookings in sync.', createdAt: minutesAgo(600), read: false, href: '/owner/integrations' },
  ];

  const receptionistFor = (name: string): ReceptionistConfig => ({
    active: true,
    name: 'Zara',
    greeting: `Assalam o alaikum, thank you for calling ${name}. This is Zara, how can I help you today?`,
    languages: ['English', 'Urdu'],
    faqs: [
      { id: 'faq-1', question: 'What are your opening hours?', answer: 'We are open every day from 10:00 AM to 8:00 PM.' },
      { id: 'faq-2', question: 'Do you have parking?', answer: 'Yes, there is free parking in front of the salon.' },
    ],
    booking: { allowBooking: true, requireConfirmation: false, minNoticeHours: 2, maxDaysAhead: 30 },
    cancellation: { allowCancellation: true, sendToReception: true },
    escalation: { transferNumber: '042 3578 1100', transferOnRequest: true, transferKeywords: ['complaint', 'manager'], afterHours: 'TAKE_MESSAGE' },
  });

  return {
    businesses,
    users,
    staff,
    services,
    customers,
    appointments,
    cancellations,
    activity,
    notifications,
    receptionist: { 'biz-maison': receptionistFor('Maison Studio'), 'biz-urban': receptionistFor('Urban Cuts') },
    integrations: {
      'biz-maison': [
        { id: 'google-calendar', name: 'Google Calendar', description: 'Two-way sync of appointments with each staff member’s calendar.', status: 'CONNECTED', account: 'bookings@maisonstudio.pk', lastSyncAt: minutesAgo(5) },
      ],
      'biz-urban': [
        { id: 'google-calendar', name: 'Google Calendar', description: 'Two-way sync of appointments with each staff member’s calendar.', status: 'DISCONNECTED' },
      ],
    },
  };
}
