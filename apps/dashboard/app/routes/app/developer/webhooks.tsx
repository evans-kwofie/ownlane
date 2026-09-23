import { getAuth } from '@clerk/react-router/server';
import { data } from 'react-router';

import { WebhooksPanel } from '../../../components/features/developer/webhooks-panel';
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  resumeWebhookEndpoint,
  rotateWebhookSecret,
  sendTestEvent,
} from '../../../features/webhooks/actions.server';
import { listWebhookEndpoints } from '../../../features/webhooks/queries.server';
import { cloudflare } from '../../../lib/cloudflare';
import { getWorkspaceForUser } from '../../../lib/workspaces.server';
import type { Route } from './+types/webhooks';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Webhooks — Ownlane' }];
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
  return { endpoints: await listWebhookEndpoints(env.DB, workspace.id) };
}

export async function action(args: Route.ActionArgs) {
  const { env, userId, workspace } = await context(args);
  const form = await args.request.formData();
  const intent = String(form.get('intent'));
  const endpointId = String(form.get('endpointId') ?? '');

  const result =
    intent === 'webhook-create'
      ? await createWebhookEndpoint(env, workspace.id, userId, Object.fromEntries(form))
      : intent === 'webhook-rotate'
        ? await rotateWebhookSecret(env, workspace.id, endpointId)
        : intent === 'webhook-delete'
          ? await deleteWebhookEndpoint(env, workspace.id, endpointId)
          : intent === 'webhook-resume'
            ? await resumeWebhookEndpoint(env, workspace.id, endpointId)
            : intent === 'webhook-test'
              ? await sendTestEvent(env, workspace.id, endpointId)
              : { ok: false as const, error: 'Unknown action.' };

  if (!result.ok) return data({ error: result.error }, { status: 400 });
  return { saved: result.message, secret: 'secret' in result ? result.secret : undefined };
}

export default function Webhooks({ loaderData }: Route.ComponentProps) {
  return <WebhooksPanel endpoints={loaderData.endpoints} />;
}
