/**
 * What a key is allowed to reach.
 *
 * There is deliberately no "all" scope. The motivating case is a website CMS
 * that needs to read a profile: it must not thereby be able to read the leads
 * of the people who contacted that profile.
 *
 * Aggregate analytics and individual leads are separate scopes for the same
 * reason — a reporting integration has no business holding customer contact
 * details.
 */
export const SCOPES = [
  'profile:read',
  'links:read',
  'content:read',
  'assets:read',
  'analytics:read',
  'audience:read',
  'leads:read',
] as const;

export type Scope = (typeof SCOPES)[number];

export const SCOPE_LABELS: Record<Scope, { label: string; detail: string; sensitive?: boolean }> = {
  'profile:read': { label: 'Read profile', detail: 'Name, bio, handle, links to identity fields.' },
  'links:read': { label: 'Read links', detail: 'Your links, collections and their ordering.' },
  'content:read': { label: 'Read content', detail: 'Imported and featured work.' },
  'assets:read': { label: 'Read assets', detail: 'Image metadata and addresses.' },
  'analytics:read': { label: 'Read analytics', detail: 'Aggregate views, clicks and sources.' },
  'audience:read': {
    label: 'Read audience summary',
    detail: 'Counts and status mix only. No personal details.',
  },
  'leads:read': {
    label: 'Read individual leads',
    detail: 'Names, email addresses and messages of people who contacted you.',
    sensitive: true,
  },
};

export function isScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value);
}

/** Every write scope is absent for now; v0 is read-only by design. */
export function parseScopes(values: string[]): Scope[] {
  return [...new Set(values.filter(isScope))];
}
