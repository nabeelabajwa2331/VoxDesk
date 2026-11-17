import { useState } from 'react';
import { api, errorMessage } from '../../api';
import { useMutation, useQuery } from '../../lib/query';
import type { Integration } from '../../types/domain';
import { useFormat } from '../auth/AuthProvider';
import { Card } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { Banner, EmptyState, QueryView } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { Calendar, Plug, RefreshCw } from '../../components/icons';

export function IntegrationsPage() {
  const q = useQuery(['integrations'], () => api.integrations.list(), []);
  return (
    <Page>
      <PageHeader title="Integrations" description="Connect VoxDesk to the tools your salon already uses." />
      <QueryView
        query={q}
        isEmpty={(d) => d.length === 0}
        empty={
          <Card>
            <EmptyState icon={<Plug size={20} strokeWidth={1.75} aria-hidden="true" />} title="No integrations available" />
          </Card>
        }
      >
        {(list) => (
          <div className="grid gap-6 lg:grid-cols-2">
            {list.map((i) => (
              <IntegrationCard key={i.id} integration={i} />
            ))}
          </div>
        )}
      </QueryView>
    </Page>
  );
}

function IntegrationCard({ integration: i }: { integration: Integration }) {
  const fmt = useFormat();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const connect = useMutation(() => api.integrations.connect(i.id), { invalidates: ['integrations', 'notifications'] });
  const disconnect = useMutation(() => api.integrations.disconnect(i.id), { invalidates: ['integrations'] });

  async function doConnect() {
    try {
      const r = await connect.run();
      if (r) toast.success(`${i.name} connected`, r.account ? `Syncing with ${r.account}` : undefined);
    } catch (e) {
      toast.error(`Could not connect ${i.name}`, errorMessage(e));
    }
  }

  async function doDisconnect() {
    try {
      await disconnect.run();
      toast.success(`${i.name} disconnected`);
      setConfirm(false);
    } catch (e) {
      toast.error(`Could not disconnect ${i.name}`, errorMessage(e));
    }
  }

  const badge =
    i.status === 'CONNECTED' ? <Badge tone="success">Connected</Badge> : i.status === 'ERROR' ? <Badge tone="danger">Sync failed</Badge> : <Badge>Not connected</Badge>;

  return (
    <Card>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md border border-line bg-surface">
              <Calendar size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h2 className="type-heading-sm">{i.name}</h2>
              <p className="type-body-sm text-ink-muted">{i.description}</p>
            </div>
          </div>
          {badge}
        </div>

        {i.status === 'ERROR' && <Banner tone="danger">{i.error ?? 'The last sync failed. Reconnect to try again.'}</Banner>}
        {connect.error !== undefined && <Banner tone="danger">{errorMessage(connect.error)}</Banner>}

        {i.status !== 'DISCONNECTED' && (
          <dl className="m-0 grid grid-cols-[110px_1fr] gap-y-2 type-body-sm">
            {i.account && (
              <>
                <dt className="font-semibold text-ink-muted">Account</dt>
                <dd className="m-0 break-all">{i.account}</dd>
              </>
            )}
            <dt className="font-semibold text-ink-muted">Last sync</dt>
            <dd className="m-0">{i.lastSyncAt ? `${fmt.relative(i.lastSyncAt)} · ${fmt.dateTime(i.lastSyncAt)}` : 'Not synced yet'}</dd>
          </dl>
        )}

        <div className="flex flex-wrap gap-3">
          {i.status === 'CONNECTED' ? (
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Disconnect
            </Button>
          ) : (
            <Button variant="primary" onClick={doConnect} loading={connect.pending} icon={i.status === 'ERROR' ? <RefreshCw size={20} strokeWidth={1.75} aria-hidden="true" /> : undefined}>
              {i.status === 'ERROR' ? 'Reconnect' : `Connect ${i.name}`}
            </Button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={doDisconnect}
        pending={disconnect.pending}
        title={`Disconnect ${i.name}?`}
        body="New bookings will stop appearing in your team’s calendars. Events already synced stay where they are."
        confirmLabel="Disconnect"
        cancelLabel="Stay connected"
      />
    </Card>
  );
}
