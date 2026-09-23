import { useEffect, useState } from 'react';
import { getAuth } from '@clerk/react-router/server';
import { CopyIcon } from 'lucide-react';
import { data, useFetcher } from 'react-router';

import { Button } from '@ownlane/ui/components/button';
import { Input } from '@ownlane/ui/components/input';
import { Label } from '@ownlane/ui/components/label';
import { toast } from '@ownlane/ui/components/sonner';

import { createApiKey, listApiKeys, revokeApiKey } from '../../../features/api/keys.server';
import { SCOPES, SCOPE_LABELS } from '../../../features/api/scopes';
import { useActionFeedback } from '../../../lib/action-feedback';
import { cloudflare } from '../../../lib/cloudflare';
import { getWorkspaceForUser } from '../../../lib/workspaces.server';
import type { Route } from './+types/keys';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'API keys — Ownlane' }];
}

async function context(args: Route.LoaderArgs | Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw new Response('Not found', { status: 404 });
  return { env, userId, workspace };
}

export async function loader(args: Route.LoaderArgs) {
  const { env, workspace } = await context(args);
  return {
    keys: await listApiKeys(env.DB, workspace.id),
    origin: env.PUBLIC_SITE_ORIGIN?.trim() || new URL(args.request.url).origin,
    slug: workspace.slug,
  };
}

export async function action(args: Route.ActionArgs) {
  const { env, userId, workspace } = await context(args);
  const form = await args.request.formData();

  if (form.get('intent') === 'revoke') {
    const result = await revokeApiKey(env.DB, workspace.id, String(form.get('keyId') ?? ''));
    return { saved: result.message };
  }

  const result = await createApiKey(env.DB, {
    workspaceId: workspace.id,
    userId,
    name: String(form.get('name') ?? ''),
    scopes: form.getAll('scopes').map(String),
    expiresInDays: form.get('expires') ? Number(form.get('expires')) : null,
  });

  if (!result.ok) return data({ error: result.error }, { status: 400 });
  return { saved: result.message, key: result.key };
}

export default function ApiKeys({ loaderData }: Route.ComponentProps) {
  const { keys, origin, slug } = loaderData;
  const fetcher = useFetcher<{ saved?: string; error?: string; key?: string }>();
  const [creating, setCreating] = useState(false);
  // Shown once. Only a hash is stored, so there is nothing to show it from later.
  const [issued, setIssued] = useState<string | null>(null);

  useActionFeedback(fetcher.data, { onSuccess: () => setCreating(false), toastErrors: false });

  useEffect(() => {
    if (fetcher.data?.key) setIssued(fetcher.data.key);
  }, [fetcher.data]);

  const active = keys.filter((key) => !key.revokedAt);

  return (
    <div className="space-y-6">
      {issued ? (
        <div
          className="rounded-xl border px-4 py-3.5"
          style={{
            borderColor: 'color-mix(in srgb, var(--chart-1) 35%, transparent)',
            background:
              'color-mix(in srgb, var(--chart-1) calc(var(--chart-wash) * 100%), var(--card))',
          }}
        >
          <p className="text-[13.5px] font-medium">Copy this key now</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Ownlane stores only a hash of it. This is the one time it can be shown.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-card px-2.5 py-1.5 font-mono text-[12px]">
              {issued}
            </code>
            <Button
              onClick={() =>
                navigator.clipboard
                  .writeText(issued)
                  .then(() => toast.success('Key copied'))
                  .catch(() => toast.error('Could not copy. Select it and copy by hand.'))
              }
              size="sm"
              type="button"
              variant="outline"
            >
              <CopyIcon />
              Copy
            </Button>
            <Button onClick={() => setIssued(null)} size="sm" type="button" variant="ghost">
              Done
            </Button>
          </div>
        </div>
      ) : null}

      {active.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border/70 bg-card">
          {active.map((key) => (
            <li
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5"
              key={key.id}
            >
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium">{key.name}</p>
                <p className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">
                  {key.keyPrefix}…
                </p>
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  {key.scopes.map((scope) => (
                    <span
                      className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                      key={scope}
                    >
                      {scope}
                    </span>
                  ))}
                </p>
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  {key.lastUsedAt
                    ? `Last used ${key.lastUsedAt}${key.lastUsedRegion ? ` · ${key.lastUsedRegion}` : ''}`
                    : 'Never used'}
                  {key.expiresAt ? ` · expires ${key.expiresAt.slice(0, 10)}` : ''}
                </p>
              </div>
              <fetcher.Form method="post">
                <input name="keyId" type="hidden" value={key.id} />
                <Button name="intent" size="sm" type="submit" value="revoke" variant="outline">
                  Revoke
                </Button>
              </fetcher.Form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-[13px] text-muted-foreground">
          No keys yet. A key reads this workspace over HTTP, and carries only the scopes you give
          it.
        </p>
      )}

      {creating ? (
        <fetcher.Form className="space-y-4 rounded-xl border border-border/70 p-4" method="post">
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              maxLength={60}
              name="name"
              placeholder="Portfolio site, Zapier production…"
              required
            />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-[13.5px] font-medium">What this key may read</legend>
            <p className="pb-1 text-[12px] text-muted-foreground">
              Grant only what it needs. A key for a website has no business reading the people who
              contacted you.
            </p>
            {SCOPES.map((scope) => (
              <label className="flex items-start gap-2.5 text-[13px]" key={scope}>
                <input
                  className="mt-1 accent-primary"
                  name="scopes"
                  type="checkbox"
                  value={scope}
                />
                <span>
                  <span className="block">
                    {SCOPE_LABELS[scope].label}
                    {SCOPE_LABELS[scope].sensitive ? (
                      <span
                        className="ml-1.5 rounded-full px-1.5 py-px text-[10.5px]"
                        style={{
                          background: 'color-mix(in srgb, var(--chart-warn) 22%, var(--card))',
                        }}
                      >
                        personal data
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    {SCOPE_LABELS[scope].detail}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="key-expires">Expires after (days, optional)</Label>
            <Input
              className="max-w-[180px]"
              id="key-expires"
              max={365}
              min={1}
              name="expires"
              placeholder="Never"
              type="number"
            />
          </div>

          {fetcher.data?.error ? (
            <p
              className="rounded-lg border px-3.5 py-2.5 text-[13px]"
              role="alert"
              style={{
                borderColor: 'color-mix(in srgb, var(--chart-down) 40%, transparent)',
                background: 'color-mix(in srgb, var(--chart-down) 8%, var(--card))',
              }}
            >
              {fetcher.data.error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button disabled={fetcher.state !== 'idle'} size="sm" type="submit">
              {fetcher.state === 'idle' ? 'Create key' : 'Creating…'}
            </Button>
            <Button onClick={() => setCreating(false)} size="sm" type="button" variant="outline">
              Cancel
            </Button>
          </div>
        </fetcher.Form>
      ) : (
        <Button onClick={() => setCreating(true)} type="button" variant="outline">
          Create key
        </Button>
      )}

      <section>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Quick start
        </p>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-border/70 bg-card p-4 font-mono text-[12px] leading-relaxed">
          {`curl ${origin}/v0/workspaces/${slug}/profile \\
  -H "Authorization: Bearer olk_live_…"`}
        </pre>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
          Available today, all read-only: <code className="font-mono">/profile</code>,{' '}
          <code className="font-mono">/links</code>, <code className="font-mono">/content</code>,{' '}
          <code className="font-mono">/analytics</code>,{' '}
          <code className="font-mono">/audience</code> and <code className="font-mono">/leads</code>
          . Responses are <code className="font-mono">{'{ data }'}</code>; errors are{' '}
          <code className="font-mono">{'{ error: { code, message } }'}</code>.{' '}
          <strong className="font-medium text-foreground">v0 is unstable</strong> — fields may
          change until the shape settles.
        </p>
      </section>
    </div>
  );
}
