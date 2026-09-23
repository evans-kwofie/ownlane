import type { Route } from './+types/service-worker';

/**
 * The service worker, served as a route so it needs no public directory and
 * stays in one language with the rest of the app.
 *
 * A push arrives with no payload; the worker asks the server what to say. If
 * that call fails — offline, signed out — it still shows something, because a
 * silent push is a notification permission spent for nothing.
 */
const SOURCE = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let summary = null;
    try {
      const response = await fetch('/notifications/summary', { credentials: 'include' });
      if (response.ok) summary = await response.json();
    } catch {}

    const title = summary
      ? (summary.count === 1 ? 'New message' : summary.count + ' new messages')
      : 'New message';
    const body = summary
      ? (summary.name ? 'From ' + summary.name : 'Someone wrote in through your profile.')
      : 'Someone wrote in through your profile.';

    await self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // One notification per workspace, replaced rather than stacked.
      tag: 'ownlane-leads',
      renotify: true,
      data: { url: (summary && summary.url) || '/app' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/app';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Reuse a tab that already has the app open rather than opening another.
    for (const client of all) {
      if (client.url.includes('/app') && 'focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
`;

export function loader(_: Route.LoaderArgs) {
  return new Response(SOURCE, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache',
    },
  });
}
