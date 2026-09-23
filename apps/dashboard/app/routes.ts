import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('continue', 'routes/continue.tsx'),
  route('assets/:id', 'routes/assets.tsx'),
  route('events/profile/:slug/view', 'routes/analytics-profile-view.tsx'),
  route('events/profile/:slug/interaction', 'routes/analytics-profile-interaction.tsx'),
  route('r/:kind/:destinationId', 'routes/outbound-redirect.tsx'),
  route('contact/:slug', 'routes/lead-capture.tsx'),

  // Public API. `v0` is unstable by design: shipping `v1` owes compatibility to
  // every integrator from that day, and the profile shape is still moving.
  // Remote MCP endpoint, and the embed a customer puts on their own site.
  route('mcp', 'routes/api/mcp.tsx'),
  route('embed.js', 'routes/embed-script.tsx'),
  route('embed/:slug', 'routes/embed-frame.tsx'),

  route('v0/workspaces/:workspace/profile', 'routes/api/v0-profile.tsx'),
  route('v0/workspaces/:workspace/links', 'routes/api/v0-links.tsx'),
  route('v0/workspaces/:workspace/content', 'routes/api/v0-content.tsx'),
  route('v0/workspaces/:workspace/analytics', 'routes/api/v0-analytics.tsx'),
  route('v0/workspaces/:workspace/audience', 'routes/api/v0-audience.tsx'),
  route('v0/workspaces/:workspace/leads', 'routes/api/v0-leads.tsx'),
  // Served from the root so its scope covers the whole app.
  route('sw.js', 'routes/service-worker.tsx'),
  route('notifications/summary', 'routes/notifications-summary.tsx'),
  route('oauth/github/setup', 'routes/oauth.github.setup.tsx'),
  route('oauth/callback/github', 'routes/oauth.github.callback.tsx'),
  route('oauth/callback/twitch', 'routes/oauth.twitch.callback.tsx'),

  route('app', 'routes/app/layout.tsx', [
    // No workspace named: resolve one and redirect.
    index('routes/app/index-redirect.tsx'),

    // Belongs to the person, not to any one identity.
    route('account', 'routes/app/account.tsx'),
    route('brands/new', 'routes/app/create-brand.tsx'),
    route('brands/delete', 'routes/app/delete-brand.tsx'),

    // Everything below is scoped to the workspace in the URL.
    route(':workspace', 'routes/app/workspace.tsx', [
      index('routes/app/overview.tsx'),

      // Identity
      route('profile', 'routes/app/profile.tsx'),
      route('profile/configuration', 'routes/app/site.tsx'),
      route('assets', 'routes/app/assets.tsx'),

      // Distribution
      route('links', 'routes/app/links.tsx'),
      route('links/new', 'routes/app/link-editor.tsx', { id: 'routes/app/link-new' }),
      route('links/:linkId', 'routes/app/link-editor.tsx', { id: 'routes/app/link-edit' }),
      route('links/collections/:collectionId', 'routes/app/collection-editor.tsx'),
      route('connections', 'routes/app/connections.tsx'),
      route('connections/new', 'routes/app/connection-catalog.tsx'),
      route('connections/github/connect', 'routes/app/connect-github.tsx'),
      route('connections/twitch/connect', 'routes/app/connect-twitch.tsx'),
      route('content', 'routes/app/content.tsx'),

      // Insight
      route('health', 'routes/app/health.tsx'),
      route('analytics', 'routes/app/analytics.tsx'),
      route('audience', 'routes/app/audience.tsx'),
      route('audience/export.csv', 'routes/app/audience-export.tsx'),
      route('audience/push', 'routes/app/audience-push.tsx'),

      route('developer', 'routes/app/developer/layout.tsx', [
        index('routes/app/developer/keys.tsx'),
        route('webhooks', 'routes/app/developer/webhooks.tsx'),
        route('mcp', 'routes/app/developer/mcp.tsx'),
        route('embeds', 'routes/app/developer/embeds.tsx'),
      ]),
      // Tabs that are real routes: each is linkable, openable in a new tab and
      // reachable with the back button.
      route('settings', 'routes/app/settings/layout.tsx', [
        index('routes/app/settings/general.tsx'),
        route('team', 'routes/app/settings/team.tsx'),
        route('billing', 'routes/app/settings/billing.tsx'),
      ]),
    ]),
  ]),

  // Published profiles live at the root: ownlane.com/<slug>. Declared last so
  // every static route above wins.
  route(':slug/contact.vcf', 'routes/public-profile-vcard.tsx'),
  route(':slug', 'routes/public-profile.tsx'),
] satisfies RouteConfig;
