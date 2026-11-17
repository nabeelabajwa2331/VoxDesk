import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../../api';
import type { Business, Session } from '../../types/domain';
import { createFormatter, type Formatter } from '../../lib/format';

type Status = 'loading' | 'authenticated' | 'anonymous' | 'error';

interface AuthContextValue {
  status: Status;
  session: Session | null;
  login: (email: string, password: string) => Promise<Session>;
  logout: () => Promise<void>;
  retry: () => void;
  refresh: () => Promise<void>;
  updateBusiness: (business: Business) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.auth.getSession().then(
      (s) => {
        if (!active) return;
        setSession(s);
        setStatus(s ? 'authenticated' : 'anonymous');
      },
      () => active && setStatus('error'),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const login = useCallback(async (email: string, password: string) => {
    const s = await api.auth.login(email, password);
    setSession(s);
    setStatus('authenticated');
    return s;
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setSession(null);
    setStatus('anonymous');
  }, []);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((a) => a + 1);
  }, []);

  const refresh = useCallback(async () => {
    const s = await api.auth.getSession();
    setSession(s);
    setStatus(s ? 'authenticated' : 'anonymous');
  }, []);

  const updateBusiness = useCallback((business: Business) => {
    setSession((s) => (s ? { ...s, business } : s));
  }, []);

  const value = useMemo(
    () => ({ status, session, login, logout, retry, refresh, updateBusiness }),
    [status, session, login, logout, retry, refresh, updateBusiness],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** The signed-in session. Only call below a route guard that guarantees one. */
export function useSession(): Session {
  const { session } = useAuth();
  if (!session) throw new Error('useSession called without a session');
  return session;
}

export function useFormat(): Formatter {
  const { business } = useSession();
  const { timeZone, currency, locale, dateFormat } = business;
  return useMemo(() => createFormatter({ timeZone, currency, locale, dateFormat }), [timeZone, currency, locale, dateFormat]);
}
