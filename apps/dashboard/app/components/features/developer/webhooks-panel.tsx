import { useEffect, useState } from 'react';
import { CopyIcon, Trash2Icon } from 'lucide-react';
import { useFetcher } from 'react-router';

import { Button } from '@ownlane/ui/components/button';
import { Input } from '@ownlane/ui/components/input';
import { Label } from '@ownlane/ui/components/label';
import { toast } from '@ownlane/ui/components/sonner';
import { cn } from '@ownlane/ui/lib/utils';

import { useActionFeedback } from '../../../lib/action-feedback';
import type { WebhookEndpoint } from '../../../features/webhooks/schema';

type Result = { saved?: string; error?: string; secret?: string };

/**
 * Where a lead is sent on to another system.
 *
 * Lives on the Developer page rather than in Audience: an HTTPS endpoint, a
 * signing secret, HMAC verification and a delivery log are developer work, and
 * somebody who lands here looking for webhooks has already found the right
 * page. Audience points here instead.
 */
export function WebhooksPanel({ endpoints }: { endpoints: WebhookEndpoint[] }) {
  const fetcher = useFetcher<Result>();
  const [adding, setAdding] = useState(false);
  // Shown once and never again: only a four-character hint is stored.
  const [secret, setSecret] = useState<string | null>(null);

  useActionFeedback(fetcher.data, {
    onSuccess: () => setAdding(false),
    toastErrors: false,
  });

  useEffect(() => {
    if (fetcher.data?.secret) setSecret(fetcher.data.secret);
  }, [fetcher.data]);

  return (
    <div className="space-y-6">
      {secret ? <SecretOnce onDismiss={() => setSecret(null)} secret={secret} /> : null}

      {endpoints.length ? (
        <ul className="space-y-3">
          {endpoints.map((endpoint) => (
            <EndpointCard endpoint={endpoint} fetcher={fetcher} key={endpoint.id} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
          No endpoints yet. Add one and every new lead is posted to it, signed so your system can
          verify it came from Ownlane.
        </p>
      )}

      {adding ? (
        <fetcher.Form className="space-y-4 rounded-xl border border-border/70 p-4" method="post">
          <input name="intent" type="hidden" value="webhook-create" />
          <div className="space-y-1.5">
            <Label htmlFor="wh-url">Endpoint URL</Label>
            <Input
              id="wh-url"
              name="url"
              placeholder="https://hooks.example.com/ownlane"
              required
              type="url"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-label">Label (optional)</Label>
            <Input id="wh-label" maxLength={60} name="label" placeholder="Zapier, My CRM…" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-[13.5px] font-medium">What to send</legend>
            {[
              {
                value: 'full',
                title: 'The full lead',
                body: 'Name, email, subject and status.',
              },
              {
                value: 'minimal',
                title: 'Just a notification',
                body: 'Identifiers only — no personal details leave Ownlane.',
              },
            ].map((option) => (
              <label
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5"
                key={option.value}
              >
                <input
                  className="mt-1 accent-primary"
                  defaultChecked={option.value === 'full'}
                  name="payloadMode"
                  type="radio"
                  value={option.value}
                />
                <span>
                  <span className="block text-[13.5px]">{option.title}</span>
                  <span className="block text-[12px] text-muted-foreground">{option.body}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {fetcher.data?.error ? <ErrorNote>{fetcher.data.error}</ErrorNote> : null}

          <div className="flex gap-2">
            <Button disabled={fetcher.state !== 'idle'} size="sm" type="submit">
              {fetcher.state === 'idle' ? 'Add endpoint' : 'Adding…'}
            </Button>
            <Button onClick={() => setAdding(false)} size="sm" type="button" variant="outline">
              Cancel
            </Button>
          </div>
        </fetcher.Form>
      ) : (
        <Button onClick={() => setAdding(true)} type="button" variant="outline">
          Add endpoint
        </Button>
      )}

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Every delivery carries an <code className="font-mono">Ownlane-Signature</code> header:{' '}
        <code className="font-mono">t=&lt;unix&gt;,v1=&lt;hmac&gt;</code>, an HMAC-SHA256 of{' '}
        <code className="font-mono">t.body</code> using your signing secret. Verify it before
        trusting a request, and reject a timestamp more than a few minutes old.
      </p>
    </div>
  );
}

function EndpointCard({
  endpoint,
  fetcher,
}: {
  endpoint: WebhookEndpoint;
  fetcher: ReturnType<typeof useFetcher<Result>>;
}) {
  const last = endpoint.lastDelivery;

  return (
    <li className="rounded-xl border border-border/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
            {endpoint.label || 'Endpoint'}
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal"
              title={endpoint.isActive ? 'Receiving events' : (endpoint.disabledReason ?? 'Off')}
            >
              <i
                className="size-1.5 rounded-full"
                style={{
                  background: endpoint.isActive ? 'var(--chart-up)' : 'var(--chart-down)',
                }}
              />
              {endpoint.isActive ? 'Active' : 'Switched off'}
            </span>
            {endpoint.payloadMode === 'minimal' ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                Notification only
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground">
            {endpoint.url}
          </p>
        </div>
      </div>

      {endpoint.disabledReason ? (
        <p className="mt-2 text-[12px]" style={{ color: 'var(--chart-down)' }}>
          {endpoint.disabledReason}
        </p>
      ) : null}

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
        <span>
          Secret ends <span className="font-mono">…{endpoint.secretHint}</span>
        </span>
        <span>
          Last delivery{' '}
          {last ? (
            <span
              className={cn(last.status !== 'succeeded' && 'font-medium')}
              style={{
                color: last.status === 'succeeded' ? undefined : 'var(--chart-down)',
              }}
            >
              {last.responseStatus ?? last.status}
              {last.durationMs ? ` · ${last.durationMs}ms` : ''}
            </span>
          ) : (
            'never'
          )}
        </span>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ['webhook-test', 'Send test event', 'outline'],
            ['webhook-rotate', 'Rotate secret', 'outline'],
            ...(endpoint.isActive ? [] : [['webhook-resume', 'Resume', 'outline'] as const]),
          ] as const
        ).map(([intent, label]) => (
          <fetcher.Form key={intent} method="post">
            <input name="endpointId" type="hidden" value={endpoint.id} />
            <Button
              disabled={fetcher.state !== 'idle'}
              name="intent"
              size="sm"
              type="submit"
              value={intent}
              variant="outline"
            >
              {label}
            </Button>
          </fetcher.Form>
        ))}
        <fetcher.Form method="post">
          <input name="endpointId" type="hidden" value={endpoint.id} />
          <Button
            aria-label="Remove endpoint"
            name="intent"
            size="icon-sm"
            type="submit"
            value="webhook-delete"
            variant="ghost"
          >
            <Trash2Icon />
          </Button>
        </fetcher.Form>
      </div>
    </li>
  );
}

/**
 * The signing secret, shown once. It cannot be recovered — the database holds
 * only a ciphertext and a four-character hint — so it is deliberately hard to
 * dismiss by accident.
 */
function SecretOnce({ onDismiss, secret }: { onDismiss: () => void; secret: string }) {
  return (
    <div
      className="rounded-xl border px-4 py-3.5"
      style={{
        borderColor: 'color-mix(in srgb, var(--chart-1) 35%, transparent)',
        background:
          'color-mix(in srgb, var(--chart-1) calc(var(--chart-wash) * 100%), var(--card))',
      }}
    >
      <p className="text-[13.5px] font-medium">Copy this signing secret now</p>
      <p className="mt-0.5 text-[12px] text-muted-foreground">
        It is not stored and cannot be shown again. If you lose it, rotate to get a new one.
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-card px-2.5 py-1.5 font-mono text-[12px]">
          {secret}
        </code>
        <Button
          onClick={() => {
            navigator.clipboard
              .writeText(secret)
              .then(() => toast.success('Secret copied'))
              .catch(() => toast.error('Could not copy. Select it and copy by hand.'));
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <CopyIcon />
          Copy
        </Button>
        <Button onClick={onDismiss} size="sm" type="button" variant="ghost">
          Done
        </Button>
      </div>
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="rounded-lg border px-3.5 py-2.5 text-[13px]"
      role="alert"
      style={{
        borderColor: 'color-mix(in srgb, var(--chart-down) 40%, transparent)',
        background: 'color-mix(in srgb, var(--chart-down) 8%, var(--card))',
      }}
    >
      {children}
    </p>
  );
}
