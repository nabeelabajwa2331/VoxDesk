export type Role = 'OWNER' | 'RECEPTIONIST' | 'STAFF';
export type Plan = 'FREE' | 'PRO';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type BookingSource = 'AI_CALL' | 'RECEPTION' | 'ONLINE' | 'OWNER';

export type DateFormat = 'medium' | 'dmy' | 'iso';

export interface TimeRange {
  start: string;
  end: string;
}

export interface DayHours {
  open: string;
  close: string;
}

/** Index 0 is Sunday, matching Date#getDay. `null` means closed. */
export type WeeklyHours = (DayHours | null)[];

export interface NotificationPreferences {
  newBooking: boolean;
  cancellation: boolean;
  dailySummary: boolean;
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS';
}

export interface CancellationPolicy {
  noticeHours: number | null;
  allowRetain: boolean;
  note: string;
}

export interface Business {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  timeZone: string;
  currency: string;
  locale: string;
  dateFormat: DateFormat;
  plan: Plan;
  workingHours: WeeklyHours;
  cancellationPolicy: CancellationPolicy;
  notifications: NotificationPreferences;
  receptionistActive: boolean;
}

export interface User {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  staffId?: string;
}

export interface Session {
  user: User;
  business: Business;
}

export interface StaffMember {
  id: string;
  businessId: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  active: boolean;
  serviceIds: string[];
  workingHours: WeeklyHours;
  upcomingCount: number;
  monthCount: number;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  staffIds: string[];
  active: boolean;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  appointmentCount: number;
  lastAppointmentAt?: string;
  nextAppointmentAt?: string;
}

export interface Appointment {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  source: BookingSource;
  price?: number;
  notes?: string;
  customerNotes?: string;
  cancelRequested?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Slot {
  start: string;
  end: string;
  staffId: string;
  staffName: string;
}

export type CancellationRequestStatus = 'OPEN' | 'APPROVED' | 'RETAINED';

export interface CancellationRequest {
  id: string;
  appointment: Appointment;
  requestedAt: string;
  reason?: string;
  channel: BookingSource;
  status: CancellationRequestStatus;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type ActivityActor = 'AI' | 'RECEPTION' | 'OWNER' | 'ONLINE' | 'STAFF' | 'SYSTEM';
export type ActivityKind = 'BOOKED' | 'CANCELLED' | 'CANCEL_REQUESTED' | 'RESCHEDULED' | 'TRANSFERRED' | 'ANSWERED' | 'CONFIRMED';

export interface Activity {
  id: string;
  kind: ActivityKind;
  actor: ActivityActor;
  actorName?: string;
  text: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface DailyPoint {
  date: string;
  booked: number;
  cancelled: number;
  revenue: number;
}

export interface Analytics {
  from: string;
  to: string;
  appointments: number;
  confirmed: number;
  cancellations: number;
  cancellationRate: number;
  revenue: number;
  previous: { appointments: number; revenue: number; cancellationRate: number };
  daily: DailyPoint[];
  services: { serviceId: string; name: string; count: number; revenue: number }[];
  staff: {
    staffId: string;
    name: string;
    title: string;
    count: number;
    revenue: number;
    cancellationRate: number;
    utilisation: number;
  }[];
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

export interface ReceptionistConfig {
  active: boolean;
  name: string;
  greeting: string;
  languages: string[];
  faqs: Faq[];
  booking: {
    allowBooking: boolean;
    requireConfirmation: boolean;
    minNoticeHours: number;
    maxDaysAhead: number;
  };
  cancellation: {
    allowCancellation: boolean;
    sendToReception: boolean;
  };
  escalation: {
    transferNumber: string;
    transferOnRequest: boolean;
    transferKeywords: string[];
    afterHours: 'TAKE_MESSAGE' | 'BOOK_ONLY';
  };
}

export interface ReceptionistTestReply {
  reply: string;
  intent: string;
  note: string;
}

export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  account?: string;
  lastSyncAt?: string;
  error?: string;
}

export interface ScheduleDay {
  date: string;
  hours: TimeRange | null;
  breaks: (TimeRange & { label: string })[];
  unavailable: (TimeRange & { label: string })[];
}

export interface StaffSchedule {
  staffId: string;
  days: ScheduleDay[];
  appointments: Appointment[];
}

export interface StaffProfile {
  user: User;
  staff: StaffMember;
  services: Service[];
  notifications: NotificationPreferences;
}

export type SubscriptionStatus = 'NONE' | 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE';

/** Billing state as the backend knows it from Stripe webhooks. The frontend never sets the plan. */
export interface Subscription {
  plan: Plan;
  status: SubscriptionStatus;
  priceLabel?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
}