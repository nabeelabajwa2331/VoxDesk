import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { errorMessage } from '../../api';
import { demoStripe } from '../../mocks/mockApi';
import { Wordmark } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/States';

/**
 * Demo-mode stand-in for Stripe's hosted Checkout and Customer Portal pages.
 * Only registered when VITE_USE_MOCKS=true; in production the backend returns real Stripe URLs.
 */
export function DemoStripePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get('mode') === 'portal' ? 'portal' : 'checkout';
  const session = params.get('session') ?? '';
  const back = params.get('return') ?? '/owner/settings';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  const returnTo = (status?: 'success' | 'cancelled') => {
    const url = new URL(back, window.location.origin);
    if (status) url.searchParams.set('billing', status);
    if (status === 'success') url.searchParams.set('session_id', session);
    navigate(`${url.pathname}${url.search}`, { replace: true });
  };

  async function run(fn: () => Promise<void>, status?: 'success') {
    setPending(true);
    setError(undefined);
    try {
      await fn();
      returnTo(status);
    } catch (e) {
      setError(e);
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Wordmark />
        <section className="flex flex-col gap-5 rounded-lg border border-line bg-raised p-6">
          <Banner tone="warning">Demo only. This is not Stripe, and no card is charged.</Banner>
          <div>
            <h1 className="type-heading-md">{mode === 'checkout' ? 'Checkout: VoxDesk Pro' : 'Billing portal'}</h1>
            <p className="mt-1 text-ink-muted">
              {mode === 'checkout'
                ? 'In production this is Stripe’s secure payment page, where the owner enters their card.'
                : 'In production this is Stripe’s customer portal for cards, invoices and cancelling.'}
            </p>
          </div>
          {error !== undefined && <Banner tone="danger">{errorMessage(error)}</Banner>}
          {mode === 'checkout' ? (
            <div className="flex flex-col gap-3">
              <Button variant="primary" loading={pending} onClick={() => run(() => demoStripe.pay(session), 'success')}>
                Simulate successful payment
              </Button>
              <Button disabled={pending} onClick={() => returnTo('cancelled')}>
                Cancel and go back
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button variant="danger" loading={pending} onClick={() => run(() => demoStripe.setCancelAtPeriodEnd(true))}>
                Cancel Pro at the end of the period
              </Button>
              <Button disabled={pending} onClick={() => run(() => demoStripe.setCancelAtPeriodEnd(false))}>
                Keep Pro renewing
              </Button>
              <Button variant="ghost" disabled={pending} onClick={() => returnTo()}>
                Back to VoxDesk
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
