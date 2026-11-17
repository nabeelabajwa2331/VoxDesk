import type { AppointmentQuery, VoxDeskApi } from './contract';
import { ApiError, type ApiErrorCode } from './errors';

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';

const STATUS_CODES: Record<number, ApiErrorCode> = {
  400: 'VALIDATION',
  401: 'UNAUTHENTICATED',
  402: 'PLAN_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
};

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | undefined | string[]>;
  idempotencyKey?: string;
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v === undefined || v === '') continue;
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, item));
    else url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return undefined as T;
  const payload: unknown = await res.json().catch(() => undefined);

  if (!res.ok) {
    const p = (payload ?? {}) as { code?: ApiErrorCode; message?: string; detail?: string; fields?: Record<string, string> };
    const code = p.code ?? STATUS_CODES[res.status] ?? 'SERVER';
    throw new ApiError(res.status, code, p.message ?? p.detail ?? 'The server could not complete the request.', p.fields);
  }
  return payload as T;
}

const get = <T>(path: string, query?: RequestOptions['query']) => request<T>('GET', path, { query });
const post = <T>(path: string, body?: unknown, idempotencyKey?: string) => request<T>('POST', path, { body, idempotencyKey });
const patch = <T>(path: string, body: unknown) => request<T>('PATCH', path, { body });
const put = <T>(path: string, body: unknown) => request<T>('PUT', path, { body });

function appointmentQuery(q: AppointmentQuery) {
  return { from: q.from, to: q.to, status: q.status, staff_id: q.staffId, service_id: q.serviceId, customer_id: q.customerId, search: q.search, sort: q.sort, limit: q.limit };
}

export const httpApi: VoxDeskApi = {
  auth: {
    async getSession() {
      try {
        return await get('/auth/session');
      } catch (e) {
        if (e instanceof ApiError && e.code === 'UNAUTHENTICATED') return null;
        throw e;
      }
    },
    login: (email, password) => post('/auth/login', { email, password }),
    logout: () => post('/auth/logout'),
    changePassword: (current, next) => post('/auth/password', { current_password: current, new_password: next }),
  },
  business: {
    update: (body) => patch('/business', body),
  },
  appointments: {
    list: (q) => get('/appointments', appointmentQuery(q)),
    get: (id) => get(`/appointments/${id}`),
    availability: (q) =>
      get('/availability', { service_id: q.serviceId, staff_id: q.staffId, date: q.date, exclude_appointment_id: q.excludeAppointmentId }),
    create: ({ idempotencyKey, ...body }) => post('/appointments', body, idempotencyKey),
    reschedule: (id, { idempotencyKey, ...body }) => post(`/appointments/${id}/reschedule`, body, idempotencyKey),
    cancel: (id, reason) => post(`/appointments/${id}/cancel`, { reason }),
    setStatus: (id, status) => post(`/appointments/${id}/status`, { status }),
  },
  customers: {
    list: (q) => get('/customers', { search: q.search }),
    get: (id) => get(`/customers/${id}`),
    history: (id) => get(`/customers/${id}/appointments`),
    create: (body) => post('/customers', body),
    update: (id, body) => patch(`/customers/${id}`, body),
  },
  staff: {
    list: () => get('/staff'),
    create: (body) => post('/staff', body),
    update: (id, body) => patch(`/staff/${id}`, body),
    setActive: (id, active) => post(`/staff/${id}/${active ? 'activate' : 'deactivate'}`),
  },
  services: {
    list: () => get('/services'),
    create: (body) => post('/services', body),
    update: (id, body) => patch(`/services/${id}`, body),
  },
  cancellations: {
    list: (status) => get('/cancellation-requests', { status }),
    approve: (id) => post(`/cancellation-requests/${id}/approve`),
    retain: (id, note) => post(`/cancellation-requests/${id}/retain`, { note }),
  },
  analytics: {
    get: (range) => get('/analytics', range),
  },
  activity: {
    list: (limit) => get('/activity', { limit }),
  },
  notifications: {
    list: () => get('/notifications'),
    markAllRead: () => post('/notifications/read-all'),
  },
  receptionist: {
    get: () => get('/receptionist'),
    update: (body) => put('/receptionist', body),
    test: (message) => post('/receptionist/test', { message }),
  },
  integrations: {
    list: () => get('/integrations'),
    connect: (id) => post(`/integrations/${id}/connect`),
    disconnect: (id) => post(`/integrations/${id}/disconnect`),
  },
  billing: {
    subscription: () => get('/billing/subscription'),
    createCheckout: (input) => post('/billing/checkout-session', { plan: input.plan, return_path: input.returnPath }),
    createPortal: (returnPath) => post('/billing/portal-session', { return_path: returnPath }),
  },
  me: {
    schedule: (from, to) => get('/me/schedule', { from, to }),
    profile: () => get('/me/profile'),
    updateProfile: (body) => patch('/me/profile', body),
  },
};
