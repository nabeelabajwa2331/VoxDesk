import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Check, TriangleAlert, X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface Toast {
  id: number;
  tone: 'success' | 'danger';
  title: string;
  body?: string;
}

interface ToastApi {
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: Toast['tone'], title: string, body?: string) => {
      const id = Date.now() + Math.random();
      setToasts((ts) => [...ts.slice(-2), { id, tone, title, body }]);
      setTimeout(() => dismiss(id), tone === 'success' ? 4500 : 8000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (t, b) => push('success', t, b), error: (t, b) => push('danger', t, b) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'danger' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3',
              t.tone === 'success' ? 'border-success-fg/30 bg-success-bg text-success-fg' : 'border-danger-fg/30 bg-danger-bg text-danger-fg',
            )}
          >
            {t.tone === 'success' ? <Check size={20} strokeWidth={1.75} aria-hidden="true" /> : <TriangleAlert size={20} strokeWidth={1.75} aria-hidden="true" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t.title}</p>
              {t.body && <p className="type-body-sm">{t.body}</p>}
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="-m-1 inline-flex size-8 items-center justify-center rounded-md">
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
