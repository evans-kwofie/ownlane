import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('continue', 'routes/continue.tsx'),
  route('assets/:id', 'routes/assets.tsx'),

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
      route('content', 'routes/app/content.tsx'),

      // Insight
      route('activity', 'routes/app/activity.tsx'),
      route('health', 'routes/app/health.tsx'),
      route('analytics', 'routes/app/analytics.tsx'),
      route('audience', 'routes/app/audience.tsx'),

      route('developer', 'routes/app/developer.tsx'),
      route('settings', 'routes/app/settings.tsx'),
    ]),
  ]),

  // Published profiles live at the root: ownlane.com/<slug>. Declared last so
  // every static route above wins.
  route(':slug/contact.vcf', 'routes/public-profile-vcard.tsx'),
  route(':slug', 'routes/public-profile.tsx'),
] satisfies RouteConfig;
