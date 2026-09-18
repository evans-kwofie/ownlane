import { createRequestHandler, RouterContextProvider } from 'react-router';

import { applyDueChanges } from '../app/lib/profiles.server';
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
   * Scheduled profile changes apply whether or not anyone has the app open, so
   * they run here rather than in a request.
   */
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      applyDueChanges(env.DB, new Date(controller.scheduledTime)).then(({ applied, failed }) => {
        if (applied || failed) console.log(`scheduled profile changes: ${applied} applied, ${failed} failed`);
      }),
    );
  },
} satisfies ExportedHandler<Env>;
