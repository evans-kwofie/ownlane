import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Link2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@ownlane/ui/components/button';
import { toast } from '@ownlane/ui/components/sonner';
import { Link, useFetcher, useSearchParams } from 'react-router';

import { PageHeader } from '../../page-header';
import { getConnectionProvider } from '../../../features/connections/providers';
import type { ConnectedAccount } from '../../../features/connections/schema';
import { PlatformIcon, getLinkPlatform, platformColors } from '../../../features/links/platforms';
import { useWorkspacePath } from '../../../lib/workspaces';
import { ConnectionManager, ConnectionStateBadge } from './connection-manager';

type Result = { message?: string; error?: string };

export function ConnectionsWorkspace({
  accounts,
  enabledProviders,
}: {
  accounts: ConnectedAccount[];
  enabledProviders: string[];
}) {
  console.log('connected accounts', accounts);
  console.log('enabled providers', enabledProviders);
  const workspacePath = useWorkspacePath();
  const [searchParams, setSearchParams] = useSearchParams();
  const mutation = useFetcher<Result>();
  const [managedId, setManagedId] = useState<string>();
  const managed = accounts.find((account) => account.id === managedId);
  const attention = accounts.filter(needsAttention);
  const connected = accounts.filter((account) => account.status === 'connected').length;
  const manual = accounts.filter((account) => account.syncMode === 'manual').length;

  useEffect(() => {
    if (mutation.data?.message) {
      toast.success(mutation.data.message);
      if (
        mutation.data.message === 'Account disconnected' ||
        mutation.data.message === 'Connection record deleted'
      )
        setManagedId(undefined);
    }
    if (mutation.data?.error) toast.error(mutation.data.error);
  }, [mutation.data]);

  useEffect(() => {
    if (searchParams.get('connected') !== 'github') return;
    toast.success('GitHub connected');
    const next = new URLSearchParams(searchParams);
    next.delete('connected');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <>
      <PageHeader
        action={
          accounts?.length > 0 && (
            <Button asChild>
              <Link to={workspacePath('/connections/new')}>
                <Plus className="size-4" /> Connect platform
              </Link>
            </Button>
          )
        }
        description="Authorize the platforms Ownlane can read from, update and keep aligned with this identity."
        title="Connections"
      />

      {accounts.length ? (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <SummaryPill icon={CheckCircle2} label={`${connected} connected`} />
          <SummaryPill
            attention={attention.length > 0}
            icon={AlertTriangle}
            label={`${attention.length} need attention`}
          />
          <SummaryPill icon={ShieldCheck} label={`${manual} manual`} />
        </div>
      ) : null}

      {attention.length ? (
        <section className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-medium">
                {attention.length}{' '}
                {attention.length === 1 ? 'connection needs' : 'connections need'} attention
              </h2>
              <div className="mt-2 space-y-1.5">
                {attention.slice(0, 3).map((account) => (
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    key={account.id}
                    onClick={() => setManagedId(account.id)}
                    type="button"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-foreground">{accountName(account)}</span> —{' '}
                      {attentionReason(account)}
                    </span>
                    <ArrowRight className="size-3.5 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {accounts.length ? (
        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Connected accounts</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Each account keeps its own permissions and synchronization policy.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {accounts.map((account) => (
              <ConnectionCard
                account={account}
                key={account.id}
                onManage={() => setManagedId(account.id)}
              />
            ))}
          </div>
        </section>
      ) : (
        <ConnectionsEmptyState catalogPath={workspacePath('/connections/new')} />
      )}

      <ConnectionManager
        account={managed}
        enabledProviders={enabledProviders}
        mutation={mutation}
        onOpenChange={(open) => !open && setManagedId(undefined)}
      />
    </>
  );
}

function ConnectionCard({
  account,
  onManage,
}: {
  account: ConnectedAccount;
  onManage: () => void;
}) {
  const provider = getConnectionProvider(account.provider);
  const platform = getLinkPlatform(provider?.iconKey ?? account.provider);
  const writable = account.capabilities.filter((item) =>
    ['write', 'read-write', 'approval'].includes(item.access),
  ).length;
  const readable = account.capabilities.filter((item) =>
    ['read', 'read-write'].includes(item.access),
  ).length;

  return (
    <article className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-lg"
          style={platformColors(platform)}
        >
          <PlatformIcon className="size-5" platform={platform} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium">{provider?.name ?? account.provider}</h3>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {accountName(account)}
                {account.accountType ? ` · ${account.accountType}` : ''}
              </p>
            </div>
            <ConnectionStateBadge account={account} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-y border-border/70 py-3">
        <CardDetail
          icon={RefreshCw}
          label="Last sync"
          value={account.lastSyncedAt ? relativeTime(account.lastSyncedAt) : 'Never'}
        />
        <CardDetail
          icon={ShieldCheck}
          label="Capabilities"
          value={
            account.capabilities.length ? `${readable} read · ${writable} update` : 'Not detected'
          }
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="size-3.5 shrink-0" />
          <span className="truncate">{syncModeLabel(account.syncMode)}</span>
        </span>
        <Button className="cursor-pointer" onClick={onManage} size="sm" variant="outline">
          Manage
        </Button>
      </div>
    </article>
  );
}

function ConnectionsEmptyState({ catalogPath }: { catalogPath: string }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="px-6 py-12 text-center sm:px-10">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
          <Link2 className="size-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold tracking-[-0.01em]">
          Connect your first platform
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          See what each provider permits, keep identity details aligned, and resolve expired access
          from one place.
        </p>
        <Button asChild className="mt-5">
          <Link to={catalogPath}>
            <Plus className="size-4" /> Browse platforms
          </Link>
        </Button>
      </div>
      <div className="grid border-t border-border/70 sm:grid-cols-3 sm:divide-x sm:divide-border/70">
        <EmptyBenefit
          description="Ownlane never assumes a provider can update a field."
          icon={ShieldCheck}
          title="Know what is supported"
        />
        <EmptyBenefit
          description="Choose which identity fields participate for each account."
          icon={RefreshCw}
          title="Control synchronization"
        />
        <EmptyBenefit
          description="Reconnect expired authorization without affecting public links."
          icon={AlertTriangle}
          title="Resolve access problems"
        />
      </div>
    </section>
  );
}

function EmptyBenefit({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="border-t border-border/70 p-5 text-left first:border-t-0 sm:border-t-0">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function SummaryPill({
  attention = false,
  icon: Icon,
  label,
}: {
  attention?: boolean;
  icon: typeof CheckCircle2;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${attention ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300' : 'border-border/70'}`}
    >
      <Icon className="size-3.5" /> {label}
    </span>
  );
}

function CardDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof RefreshCw;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3" /> {label}
      </span>
      <p className="mt-1 truncate text-xs font-medium">{value}</p>
    </div>
  );
}

function needsAttention(account: ConnectedAccount) {
  return (
    account.status === 'reconnect_required' ||
    (account.status === 'connected' && ['expired', 'missing'].includes(account.tokenHealth)) ||
    account.latestSyncStatus === 'failed' ||
    !!account.lastErrorMessage
  );
}

function attentionReason(account: ConnectedAccount) {
  if (account.status === 'reconnect_required') return 'authorization must be renewed';
  if (account.tokenHealth === 'expired') return 'authorization has expired';
  if (account.tokenHealth === 'missing') return 'authorization is missing';
  if (account.lastErrorMessage) return account.lastErrorMessage;
  return 'the latest synchronization failed';
}

function accountName(account: ConnectedAccount) {
  if (account.displayName) return account.displayName;
  if (account.handle) return `@${account.handle.replace(/^@/, '')}`;
  return account.providerAccountId;
}

function syncModeLabel(mode: ConnectedAccount['syncMode']) {
  return (
    {
      off: 'Synchronization off',
      manual: 'Manual synchronization',
      automatic: 'Automatic synchronization',
      scheduled: 'Scheduled synchronization',
    } as const
  )[mode];
}

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Unknown';
  const difference = Date.now() - time;
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (difference < 60_000) return 'Just now';
  if (difference < 3_600_000) return formatter.format(-Math.round(difference / 60_000), 'minute');
  if (difference < 86_400_000) return formatter.format(-Math.round(difference / 3_600_000), 'hour');
  if (difference < 2_592_000_000)
    return formatter.format(-Math.round(difference / 86_400_000), 'day');
  return new Date(value).toLocaleDateString();
}
