/**
 * Where a handle lives publicly on each platform.
 *
 * Only platforms whose profile URL is a predictable function of the handle are
 * listed. Anything that needs a numeric id, a search, or a login to resolve is
 * absent by design — a check that cannot be made honestly is worse than no
 * check, because an inconclusive result reads as an answer.
 */
export const HANDLE_URLS: Record<string, (handle: string) => string> = {
  instagram: (h) => `https://www.instagram.com/${h}/`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  x: (h) => `https://x.com/${h}`,
  threads: (h) => `https://www.threads.net/@${h}`,
  pinterest: (h) => `https://www.pinterest.com/${h}/`,
  reddit: (h) => `https://www.reddit.com/user/${h}`,
  twitch: (h) => `https://www.twitch.tv/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  github: (h) => `https://github.com/${h}`,
  gitlab: (h) => `https://gitlab.com/${h}`,
  medium: (h) => `https://medium.com/@${h}`,
  substack: (h) => `https://${h}.substack.com`,
  behance: (h) => `https://www.behance.net/${h}`,
  dribbble: (h) => `https://dribbble.com/${h}`,
  soundcloud: (h) => `https://soundcloud.com/${h}`,
  vimeo: (h) => `https://vimeo.com/${h}`,
  telegram: (h) => `https://t.me/${h}`,
  wordpress: (h) => `https://${h}.wordpress.com`,
};

/** A handle only resolves as a URL if it is the shape platforms accept. */
export function isCheckableHandle(handle: string) {
  return /^[a-zA-Z0-9._-]{2,40}$/.test(handle);
}

export const HANDLE_PROVIDERS = Object.keys(HANDLE_URLS);

/**
 * Where to go to claim a handle.
 *
 * Derived from the same map used to check it, rather than a separate list of
 * signup URLs: a hand-maintained list of sign-up paths rots silently, and
 * sending someone to a dead page is worse than sending them to the front door.
 */
export function platformOrigin(provider: string) {
  const build = HANDLE_URLS[provider];
  if (!build) return null;
  try {
    return new URL(build('handle')).origin;
  } catch {
    return null;
  }
}
