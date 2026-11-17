import type {
  Activity,
  Analytics,
  AppNotification,
  Appointment,
  AppointmentStatus,
  Business,
  CancellationRequest,
  CancellationRequestStatus,
  Customer,
  Integration,
  NotificationPreferences,
  ReceptionistConfig,
  ReceptionistTestReply,
  Service,
  Session,
  Slot,
  StaffMember,
  StaffProfile,
  StaffSchedule,
  Subscription,
} from '../types/domain';

export interface AppointmentQuery {
  from?: string;
  to?: string;
  status?: AppointmentStatus[];
  staffId?: string;
  serviceId?: string;
  customerId?: string;
  search?: string;
  sort?: 'asc' | 'desc';
  limit?: number;
}

export interface AvailabilityQuery {
  serviceId: string;
  staffId?: string;
  date: string;
  excludeAppointmentId?: string;
}

export interface CreateAppointmentInput {
  customerId: string;
  serviceId: string;
  staffId: string;
  start: string;
  notes?: string;
  idempotencyKey: string;
}

export interface RescheduleInput {
  start: string;
  staffId: string;
  idempotencyKey: string;
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export type StaffInput = Pick<StaffMember, 'name' | 'title' | 'phone' | 'email' | 'serviceIds' | 'workingHours'>;
export type ServiceInput = Pick<Service, 'name' | 'description' | 'durationMin' | 'price' | 'staffIds' | 'active'>;

export interface ProfilePatch {
  phone?: string;
  email?: string;
  notifications?: NotificationPreferences;
}

/**
 * Everything the frontend asks of the backend. `httpApi` implements it against
 * the FastAPI service; `mockApi` implements it in memory for demos. The backend
 * is the authority for availability, permissions and tenant isolation: the
 * session cookie identifies the user and business, so no call sends a tenant id.
 */
export interface VoxDeskApi {
  auth: {
    getSession(): Promise<Session | null>;
    login(email: string, password: string): Promise<Session>;
    logout(): Promise<void>;
    changePassword(current: string, next: string): Promise<void>;
  };
  business: {
    update(patch: Partial<Omit<Business, 'id' | 'plan'>>): Promise<Business>;
  };
  appointments: {
    list(query: AppointmentQuery): Promise<Appointment[]>;
    get(id: string): Promise<Appointment>;
    availability(query: AvailabilityQuery): Promise<Slot[]>;
    create(input: CreateAppointmentInput): Promise<Appointment>;
    reschedule(id: string, input: RescheduleInput): Promise<Appointment>;
    cancel(id: string, reason: string): Promise<Appointment>;
    setStatus(id: string, status: Extract<AppointmentStatus, 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW'>): Promise<Appointment>;
  };
  customers: {
    list(query: { search?: string }): Promise<Customer[]>;
    get(id: string): Promise<Customer>;
    history(id: string): Promise<Appointment[]>;
    create(input: CustomerInput): Promise<Customer>;
    update(id: string, patch: Partial<CustomerInput>): Promise<Customer>;
  };
  staff: {
    list(): Promise<StaffMember[]>;
    create(input: StaffInput): Promise<StaffMember>;
    update(id: string, patch: Partial<StaffInput>): Promise<StaffMember>;
    setActive(id: string, active: boolean): Promise<StaffMember>;
  };
  services: {
    list(): Promise<Service[]>;
    create(input: ServiceInput): Promise<Service>;
    update(id: string, patch: Partial<ServiceInput>): Promise<Service>;
  };
  cancellations: {
    list(status?: CancellationRequestStatus): Promise<CancellationRequest[]>;
    approve(id: string): Promise<CancellationRequest>;
    retain(id: string, note: string): Promise<CancellationRequest>;
  };
  analytics: {
    get(range: { from: string; to: string }): Promise<Analytics>;
  };
  activity: {
    list(limit: number): Promise<Activity[]>;
  };
  notifications: {
    list(): Promise<AppNotification[]>;
    markAllRead(): Promise<void>;
  };
  receptionist: {
    get(): Promise<ReceptionistConfig>;
    update(config: ReceptionistConfig): Promise<ReceptionistConfig>;
    test(message: string): Promise<ReceptionistTestReply>;
  };
  integrations: {
    list(): Promise<Integration[]>;
    connect(id: string): Promise<Integration>;
    disconnect(id: string): Promise<Integration>;
  };
  billing: {
    subscription(): Promise<Subscription>;
    /** Creates a Stripe Checkout Session on the backend and returns its hosted URL. */
    createCheckout(input: { plan: 'PRO'; returnPath: string }): Promise<{ url: string }>;
    /** Creates a Stripe Customer Portal session for changing card, invoices or cancelling. */
    createPortal(returnPath: string): Promise<{ url: string }>;
  };
  me: {
    schedule(from: string, to: string): Promise<StaffSchedule>;
    profile(): Promise<StaffProfile>;
    updateProfile(patch: ProfilePatch): Promise<StaffProfile>;
  };
}
