import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api, errorMessage } from '../../api';
import { invalidate, useQuery } from '../../lib/query';
import type { Subscription } from '../../types/domain';
import { useAuth, useFormat } from '../auth/AuthProvider';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Banner, ErrorState, Loading, Spinner } from '../../components/ui/States';
import { useBillingRedirect } from './useBilling';

const STATUS: Record<Subscription['status'], { label: string; tone: BadgeTone }> = {
  NONE: { label: 'Free plan', tone: 'neutral' },
  ACTIVE: { label: 'Active', tone: 'success' },
  TRIALING: { label: 'Trial', tone: 'success' },
  PAST_DUE: { label: 'Payment overdue', tone: 'danger' },
  CANCELED: { label: 'Cancelled', tone: 'neutral' },
  INCOMPLETE: { label: 'Payment incomplete', tone: 'warning' },
};

const POLL_MS = 3000;
const POLL_LIMIT = 20;

export function BillingCard() {
  const fmt = useFormat();
  const { refresh } = useAuth();
  const [params, setParams] = useSearchParams();
  const returned = params.get('billing');
  const q = useQuery(['billing'], () => api.billing.subscription(), []);
  const billing = useBillingRedirect();
  const [waiting, setWaiting] = useState(returned === 'success');
  const polls = useRef(0);

  const sub = q.data;
  const isPro = sub?.plan === 'PRO';

  useEffect(() => {
    if (!waiting) return;
    if (isPro) {
      refresh().catch(() => undefined);
      invalidate('services');
      const t = setTimeout(() => setWaiting(false), 0);
      return () => clearTimeout(t);
    }
    if (polls.current >= POLL_LIMIT) {
      const t = setTimeout(() => setWaiting(false), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      polls.current += 1;
      invalidate('billing');
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [waiting, isPro, sub, refresh]);

  const dismiss = () => {
    const next = new URLSearchParams(params);
    next.delete('billing');
    next.delete('session_id');
    setParams(next, { replace: true });
  };

  return (
    <Card id="billing">
      <CardHeader title="Plan and billing" description="Payments are handled securely by Stripe. VoxDesk never sees your card details." />
      <div className="flex flex-col gap-4 px-6 pb-6">
        {returned === 'success' && (
          <Banner tone={isPro ? 'success' : 'warning'}>
            {isPro ? (
              'Payment confirmed. You are on the Pro plan.'
            ) : waiting ? (
              <span className="flex items-center gap-2">
                <Spinner size={16} /> Waiting for Stripe to confirm your payment. This usually takes a few seconds.
              </span>
            ) : (
              'Stripe has not confirmed the payment yet. Refresh this page in a minute, or contact us if it does not update.'
            )}
          </Banner>
        )}
        {returned === 'cancelled' && <Banner tone="warning">Checkout was cancelled. Nothing was charged.</Banner>}
        {billing.error !== undefined && <Banner tone="danger">{errorMessage(billing.error)}</Banner>}

        {q.error && !sub ? (
          <ErrorState error={q.error} onRetry={q.reload} />
        ) : !sub ? (
          <Loading rows={2} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="type-heading-sm">{isPro ? 'Pro' : 'Free'}</p>
                {sub.priceLabel && <p className="text-ink-muted">{sub.priceLabel}</p>}
              </div>
              <Badge tone={STATUS[sub.status].tone}>{STATUS[sub.status].label}</Badge>
            </div>
            {isPro && sub.currentPeriodEnd && (
              <p className="type-body-sm text-ink-muted">
                {sub.cancelAtPeriodEnd ? `Pro ends on ${fmt.date(sub.currentPeriodEnd)}. You can renew before then.` : `Renews on ${fmt.date(sub.currentPeriodEnd)}.`}
              </p>
            )}
            {sub.status === 'PAST_DUE' && <Banner tone="danger">Your last payment failed. Update your card to keep Pro features.</Banner>}
            {!isPro && <p className="text-ink-muted">Pro adds services and pricing management. Everything else stays available on Free.</p>}
            <div className="flex flex-wrap gap-3">
              {!isPro && (
                <Button variant="primary" loading={billing.pending === 'checkout'} disabled={!!billing.pending || waiting} onClick={() => billing.startCheckout()}>
                  Upgrade to Pro
                </Button>
              )}
              {sub.hasBillingAccount && (
                <Button loading={billing.pending === 'portal'} disabled={!!billing.pending} onClick={() => billing.openPortal()}>
                  Manage billing
                </Button>
              )}
              {returned && (
                <Button variant="ghost" onClick={dismiss}>
                  Dismiss
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
