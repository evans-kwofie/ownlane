import { createRequestHandler, RouterContextProvider } from 'react-router';

import { applyDueChanges } from '../app/lib/profiles.server';
import { renewExpiringTokens } from '../app/features/connections/token-refresh.server';
import { checkDueLinks } from '../app/features/links/link-health.server';
import { retryDueDeliveries } from '../app/features/webhooks/dispatch.server';
import { cloudflare } from '../app/lib/cloudflare';

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

export default {
  fetch(request, env, ctx) {
    const context = new RouterContextProvider();
    context.set(cloudflare, { env, ctx });

    return requestHandler(request, context);
  },

  /**
   * Work that must happen whether or not anyone has the app open: scheduled
   * profile changes, and renewing provider credentials before they lapse.
   *
   * Keeping a connection authorised is Ownlane's job. Nobody using this product
   * should ever be told their OAuth token expired, so renewal runs here rather
   * than waiting for someone to open a page.
   */
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      applyDueChanges(env.DB, new Date(controller.scheduledTime)).then(({ applied, failed }) => {
        if (applied || failed)
          console.log(`scheduled profile changes: ${applied} applied, ${failed} failed`);
      }),
    );

    ctx.waitUntil(
      retryDueDeliveries(env)
        .then(({ retried }) => {
          if (retried) console.log(`webhooks: ${retried} deliveries retried`);
        })
        .catch((error) => console.error('webhook retry failed', error)),
    );

    ctx.waitUntil(
      checkDueLinks(env)
        .then(({ checked, broken }) => {
          if (checked) console.log(`link health: ${checked} checked, ${broken} broken`);
        })
        .catch((error) => console.error('link health check failed', error)),
    );

    ctx.waitUntil(
      renewExpiringTokens(env)
        .then(({ renewed, failed }) => {
          if (renewed || failed) console.log(`token renewal: ${renewed} renewed, ${failed} failed`);
        })
        .catch((error) => console.error('token renewal failed', error)),
    );
  },
} satisfies ExportedHandler<Env>;
