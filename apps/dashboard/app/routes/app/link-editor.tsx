import { useEffect } from 'react';
import { getAuth } from '@clerk/react-router/server';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@ownlane/ui/components/button';
import { Input } from '@ownlane/ui/components/input';
import { Label } from '@ownlane/ui/components/label';
import { toast } from '@ownlane/ui/components/sonner';
import { data, Link, useFetcher, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';

import { PageHeader } from '../../components/page-header';
import { createProfileLink, updateProfileLink } from '../../features/links/actions.server';
import { readProfileLink } from '../../features/links/queries.server';
import { linkSchema, type LinkInput } from '../../features/links/schema';
import { cloudflare } from '../../lib/cloudflare';
import { readProfile } from '../../lib/profiles.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/link-editor';

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw new Response('Not found', { status: 404 });
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('Not found', { status: 404 });
  const link = args.params.linkId
    ? await readProfileLink(env.DB, profile.id, args.params.linkId)
    : null;
  if (args.params.linkId && !link) throw new Response('Not found', { status: 404 });
  return { link };
}

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw new Response('Unauthorized', { status: 401 });
  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw new Response('Not found', { status: 404 });
  const profile = await readProfile(env.DB, workspace.id);
  if (!profile) throw new Response('Not found', { status: 404 });
  const parsed = linkSchema.safeParse(Object.fromEntries(await args.request.formData()));
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return data(
      { fieldErrors: { label: errors.label?.[0], url: errors.url?.[0] } },
      { status: 400 },
    );
  }
  if (args.params.linkId) {
    if (!(await updateProfileLink(env.DB, profile.id, args.params.linkId, parsed.data)))
      throw new Response('Not found', { status: 404 });
    return { saved: 'Link updated' };
  }
  await createProfileLink(env.DB, profile.id, parsed.data);
  return { saved: 'Link added' };
}

type ActionData = { saved?: string; fieldErrors?: Partial<Record<keyof LinkInput, string>> };

export default function LinkEditor({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<ActionData>();
  const navigate = useNavigate();
  const form = useForm<LinkInput>({
    defaultValues: loaderData.link ?? {
      label: '',
      url: '',
      publicationStatus: 'draft',
      startsAt: '',
      endsAt: '',
    },
    resolver: zodResolver(linkSchema),
  });
  const editing = !!loaderData.link;
  const error = (field: keyof LinkInput) => form.formState.errors[field]?.message;

  useEffect(() => {
    for (const [field, message] of Object.entries(fetcher.data?.fieldErrors ?? {})) {
      if (message) form.setError(field as keyof LinkInput, { message });
    }
  }, [fetcher.data, form]);
  useEffect(() => {
    if (!fetcher.data?.saved) return;
    toast.success(fetcher.data.saved);
    navigate('../links');
  }, [fetcher.data, navigate]);

  return (
    <>
      <PageHeader
        action={
          <Button asChild variant="outline">
          <Link to="../links">Cancel</Link>
          </Button>
        }
        description="Choose the destination and the label visitors will see on your public profile."
        title={editing ? 'Edit link' : 'Add link'}
      />
      <form
        className="max-w-xl space-y-5 rounded-xl border border-border/70 bg-card p-5 sm:p-6"
        onSubmit={form.handleSubmit((values) => fetcher.submit(values, { method: 'post' }))}
      >
        <div className="space-y-2">
          <Label htmlFor="link-label">Label</Label>
          <Input
            aria-describedby={error('label') ? 'link-label-error' : undefined}
            aria-invalid={!!error('label')}
            id="link-label"
            placeholder="Portfolio"
            {...form.register('label')}
          />
          {error('label') ? (
            <p className="text-sm text-destructive" id="link-label-error">
              {error('label')}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="link-status">Publishing</Label>
          <select
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            id="link-status"
            {...form.register('publicationStatus')}
          >
            <option value="draft">Draft — only visible to you</option>
            <option value="live">Live now</option>
            <option value="scheduled">Scheduled</option>
            <option value="paused">Paused</option>
          </select>
        </div>
        {form.watch('publicationStatus') === 'scheduled' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="link-starts-at">Go live</Label>
              <Input id="link-starts-at" type="datetime-local" {...form.register('startsAt')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-ends-at">Stop showing (optional)</Label>
              <Input id="link-ends-at" type="datetime-local" {...form.register('endsAt')} />
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="link-url">URL</Label>
          <Input
            aria-describedby={error('url') ? 'link-url-error' : undefined}
            aria-invalid={!!error('url')}
            id="link-url"
            inputMode="url"
            placeholder="https://example.com"
            {...form.register('url')}
          />
          {error('url') ? (
            <p className="text-sm text-destructive" id="link-url-error">
              {error('url')}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button disabled={fetcher.state !== 'idle'} type="submit">
            {fetcher.state !== 'idle' ? 'Saving…' : editing ? 'Save link' : 'Add link'}
          </Button>
        </div>
      </form>
    </>
  );
}
