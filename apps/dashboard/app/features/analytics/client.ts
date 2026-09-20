export const PROFILE_INTERACTIONS = [
  'contact_booking',
  'contact_email',
  'contact_phone',
  'contact_whatsapp',
  'copy_link',
  'qr_open',
  'save_contact',
  'share',
  'website',
] as const;

export type ProfileInteraction = (typeof PROFILE_INTERACTIONS)[number];

/** Sends an intentional profile interaction without delaying navigation or exposing visitor data. */
export function trackProfileInteraction(slug: string, interaction: ProfileInteraction) {
  const url = `/events/profile/${encodeURIComponent(slug)}/interaction`;
  const body = JSON.stringify({ interaction });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    return;
  }

  void fetch(url, {
    method: 'POST',
    body,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  });
}
