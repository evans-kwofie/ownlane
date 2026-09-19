import { AlertTriangle, Check, LockKeyhole, Unplug } from 'lucide-react';
import { Badge } from '@ownlane/ui/components/badge';
import { Button } from '@ownlane/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ownlane/ui/components/dialog';
import { FormSheet } from '@ownlane/ui/components/form-sheet';
import { Label } from '@ownlane/ui/components/label';
import { Link, type useFetcher } from 'react-router';

import { getConnectionProvider } from '../../../features/connections/providers';
import type { ConnectedAccount, CapabilityAccess } from '../../../features/connections/schema';
import { PlatformIcon, getLinkPlatform, platformColors } from '../../../features/links/platforms';
import { useWorkspacePath } from '../../../lib/workspaces';

type Result = { message?: string; error?: string };

export function ConnectionManager({
  account,
  enabledProviders,
  mutation,
  onOpenChange,
}: {
  account: ConnectedAccount | undefined;
  enabledProviders: string[];
  mutation: ReturnType<typeof useFetcher<Result>>;
  onOpenChange: (open: boolean) => void;
}) {
  const workspacePath = useWorkspacePath();
  const provider = account ? getConnectionProvider(account.provider) : undefined;
  const platform = account ? getLinkPlatform(provider?.iconKey ?? account.provider) : undefined;
  const adapterAvailable = account ? enabledProviders.includes(account.provider) : false;
  const writableFields =
    account?.capabilities.filter((capability) =>
      ['write', 'read-write', 'approval'].includes(capability.access),
    ) ?? [];

  return (
    <FormSheet
      description="Review authorization, provider capabilities and how this account participates in synchronization."
      footer={
        account ? (
          <>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
            {account.status === 'connected' ? (
              <Button
                disabled={mutation.state !== 'idle'}
                form="connection-preferences"
                name="intent"
                type="submit"
                value="save-preferences"
              >
                {mutation.state === 'idle' ? 'Save preferences' : 'Saving…'}
              </Button>
            ) : null}
          </>
        ) : undefined
      }
      onOpenChange={onOpenChange}
      open={!!account}
      size="wide"
      title={provider?.name ?? account?.provider ?? 'Connection'}
    >
      {account ? (
        <mutation.Form
          className="space-y-6"
          id="connection-preferences"
          key={account.id}
          method="post"
        >
          <input name="accountId" type="hidden" value={account.id} />
          <section className="flex items-center gap-3 rounded-xl border border-border/70 p-4">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-lg"
              style={platformColors(platform)}
            >
              <PlatformIcon className="size-5" platform={platform} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {account.displayName || account.handle || provider?.name || account.provider}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[account.handle && `@${account.handle.replace(/^@/, '')}`, account.accountType]
                  .filter(Boolean)
                  .join(' · ') || 'Connected account'}
              </p>
            </div>
            <ConnectionStateBadge account={account} />
          </section>

          {account.lastErrorMessage ? (
            <section className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Last connection error</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {account.lastErrorMessage}
                  </p>
                  <Button
                    className="mt-2 h-auto px-0 text-xs"
                    name="intent"
                    type="submit"
                    value="clear-error"
                    variant="link"
                  >
                    Dismiss error
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <SectionHeading
              description="What this provider permits Ownlane to do with each identity field."
              title="Capabilities"
            />
            {account.capabilities.length ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-border/70">
                {account.capabilities.map((capability, index) => (
                  <div
                    className={`flex items-center justify-between gap-4 px-4 py-3 ${index ? 'border-t border-border/70' : ''}`}
                    key={capability.field}
                  >
                    <span className="text-sm">{capability.label}</span>
                    <CapabilityBadge access={capability.access} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-xs leading-relaxed text-muted-foreground">
                Ownlane has not received a capability manifest for this account yet. No automatic
                updates will be assumed.
              </p>
            )}
          </section>

          <section>
            <SectionHeading
              description="A connection stays private unless you intentionally create a public destination from it."
              title="Public presence"
            />
            <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-border/70 p-4">
              <div>
                <p className="text-sm font-medium">
                  {account.publicLinkCount
                    ? `${account.publicLinkCount} public ${account.publicLinkCount === 1 ? 'link uses' : 'links use'} this account`
                    : 'Not displayed as a public link'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Link presentation, thumbnails and visibility are managed separately.
                </p>
              </div>
              <Button asChild className="shrink-0" size="sm" variant="outline">
                <Link to={workspacePath('/links')}>
                  {account.publicLinkCount ? 'Manage links' : 'Add link'}
                </Link>
              </Button>
            </div>
          </section>

          <section>
            <SectionHeading
              description="Choose when this account may receive permitted changes from Ownlane."
              title="Synchronization"
            />
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="connection-sync-mode">Sync behavior</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  defaultValue={account.syncMode}
                  id="connection-sync-mode"
                  name="syncMode"
                >
                  <option value="off">Off</option>
                  <option value="manual">Only when I approve it</option>
                  <option disabled={!adapterAvailable} value="automatic">
                    Automatic{adapterAvailable ? '' : ' — provider adapter required'}
                  </option>
                  <option disabled={!adapterAvailable} value="scheduled">
                    Scheduled{adapterAvailable ? '' : ' — provider adapter required'}
                  </option>
                </select>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-border/70 p-3.5">
                <input
                  className="mt-0.5"
                  defaultChecked={account.approvalRequired}
                  name="approvalRequired"
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-medium">Require approval before changes</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    Ownlane prepares the update, but a workspace member must approve it.
                  </span>
                </span>
              </label>
              {writableFields.length ? (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Fields allowed to sync</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {writableFields.map((capability) => (
                      <label
                        className="flex items-center gap-2.5 rounded-lg border border-border/70 px-3 py-2.5 text-sm"
                        key={capability.field}
                      >
                        <input
                          defaultChecked={
                            !account.selectedFields.length ||
                            account.selectedFields.includes(capability.field)
                          }
                          name="fields"
                          type="checkbox"
                          value={capability.field}
                        />
                        {capability.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </div>
          </section>

          <section>
            <SectionHeading
              description="Authorization details are kept private and never exposed on your public profile."
              title="Authorization"
            />
            <dl className="mt-3 grid gap-3 rounded-xl border border-border/70 p-4 sm:grid-cols-2">
              <Detail label="Token health" value={tokenHealthLabel(account.tokenHealth)} />
              <Detail
                label="Last successful sync"
                value={account.lastSyncedAt ? formatDate(account.lastSyncedAt) : 'Never'}
              />
              <Detail label="Account ID" value={account.providerAccountId} />
              <Detail label="Connected" value={formatDate(account.createdAt)} />
            </dl>
            {account.scopes.length ? (
              <div className="mt-3">
                <p className="text-xs font-medium">Granted permissions</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {account.scopes.map((scope) => (
                    <Badge key={scope} variant="secondary">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="border-t border-border/70 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {account.status === 'revoked' ? 'Remove connection record' : 'Disconnect account'}
                </p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Public links remain intact. Disconnecting stops private access and
                  synchronization.
                </p>
              </div>
              <DisconnectButton account={account} mutation={mutation} />
            </div>
          </section>
        </mutation.Form>
      ) : null}
    </FormSheet>
  );
}

function DisconnectButton({
  account,
  mutation,
}: {
  account: ConnectedAccount;
  mutation: ReturnType<typeof useFetcher<Result>>;
}) {
  const deleting = account.status === 'revoked';
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className={`shrink-0 ${deleting ? 'text-destructive hover:text-destructive' : ''}`}
          type="button"
          variant="outline"
        >
          <Unplug className="size-3.5" /> {deleting ? 'Delete record' : 'Disconnect'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {deleting ? 'Delete this connection record?' : 'Disconnect this account?'}
          </DialogTitle>
          <DialogDescription>
            {deleting
              ? 'This permanently removes the stored connection record. Existing public links are not deleted.'
              : 'Ownlane will delete stored authorization credentials and stop synchronizing this account. Existing public links are not deleted.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            className="text-destructive hover:text-destructive"
            disabled={mutation.state !== 'idle'}
            form="connection-preferences"
            name="intent"
            type="submit"
            value={deleting ? 'delete-connection' : 'disconnect'}
            variant="outline"
          >
            {deleting ? 'Delete record' : 'Disconnect account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.07em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm">{value}</dd>
    </div>
  );
}

function CapabilityBadge({ access }: { access: CapabilityAccess }) {
  const labels: Record<CapabilityAccess, string> = {
    read: 'Read',
    write: 'Update',
    'read-write': 'Read and update',
    manual: 'Manual only',
    approval: 'Approval required',
    unsupported: 'Unsupported',
  };
  return (
    <Badge variant={access === 'unsupported' ? 'secondary' : 'outline'}>{labels[access]}</Badge>
  );
}

export function ConnectionStateBadge({ account }: { account: ConnectedAccount }) {
  const attention =
    account.status === 'reconnect_required' ||
    account.tokenHealth === 'expired' ||
    account.tokenHealth === 'missing';
  if (account.status === 'revoked') return <Badge variant="secondary">Disconnected</Badge>;
  if (account.status === 'pending') return <Badge variant="secondary">Connecting</Badge>;
  if (attention)
    return (
      <Badge variant="destructive">
        <LockKeyhole className="size-3" /> Reconnect
      </Badge>
    );
  return (
    <Badge variant="outline">
      <Check className="size-3" /> Connected
    </Badge>
  );
}

function tokenHealthLabel(value: ConnectedAccount['tokenHealth']) {
  return (
    {
      unknown: 'Not checked',
      healthy: 'Healthy',
      expiring: 'Expiring soon',
      expired: 'Expired',
      missing: 'No authorization',
    } as const
  )[value];
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}
