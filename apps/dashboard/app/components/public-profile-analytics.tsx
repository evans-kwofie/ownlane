import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** A one-per-session beacon keeps public-profile views accurate without delaying the page. */
export function PublicProfileAnalytics({ slug }: { slug: string }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const attributionKey = ['utm_source', 'utm_medium', 'utm_campaign']
    .map((key) => `${key}=${params.get(key) ?? ''}`)
    .join('&');

  useEffect(() => {
    // One untagged view is enough per session, while a distinct campaign is a
    // meaningful separate visit that should retain its attribution.
    const key = `ownlane:profile-view:${slug}:${attributionKey}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    const url = `/events/profile/${encodeURIComponent(slug)}/view`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([], { type: 'text/plain' }));
      return;
    }
    void fetch(url, { method: 'POST', credentials: 'same-origin', keepalive: true });
  }, [slug, attributionKey]);

  return null;
}
