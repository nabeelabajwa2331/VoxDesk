import { useCallback, useState } from 'react';
import { api } from '../../api';

/**
 * Sends the owner to the hosted Stripe page the backend created. The button
 * stays locked until the browser leaves, so a double click cannot open two sessions.
 */
export function useBillingRedirect() {
  const [pending, setPending] = useState<'checkout' | 'portal' | null>(null);
  const [error, setError] = useState<unknown>(undefined);

  const go = useCallback(async (kind: 'checkout' | 'portal', returnPath: string) => {
    if (pending) return;
    setPending(kind);
    setError(undefined);
    try {
      const { url } =
        kind === 'checkout' ? await api.billing.createCheckout({ plan: 'PRO', returnPath }) : await api.billing.createPortal(returnPath);
      window.location.assign(url);
    } catch (e) {
      setError(e);
      setPending(null);
    }
  }, [pending]);

  return {
    pending,
    error,
    startCheckout: (returnPath = '/owner/settings') => go('checkout', returnPath),
    openPortal: (returnPath = '/owner/settings') => go('portal', returnPath),
  };
}
