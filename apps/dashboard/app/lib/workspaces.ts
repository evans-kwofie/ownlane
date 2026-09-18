import { useParams, useRouteLoaderData } from 'react-router';

/**
 * The identities this account can act as. The list is loaded once, on the
 * server, by the /app layout; these hooks read it rather than deriving it.
 *
 * The active workspace lives in the URL (`/app/:workspace/...`), never in
 * ambient state — two tabs must be able to sit in two different brands without
 * one silently rewriting the other's data.
 */

export type Workspace = {
  id: string;
  /** The URL segment. Unique, stable, and redirected when renamed. */
  slug: string;
  name: string;
  /** A personal workspace is the account's own identity; it cannot be left. */
  kind: 'personal' | 'brand';
  /** The profile photo, as an asset id served from /assets/:id. */
  avatarAssetId?: string;
};

const LAST_USED_KEY = 'ownlane:last-workspace';

type LayoutData = { workspaces?: Workspace[]; publicSiteOrigin?: string };

export function useWorkspaces(): Workspace[] {
  const data = useRouteLoaderData('routes/app/layout') as LayoutData | undefined;
  return data?.workspaces ?? [];
}

/** Where a published profile is served from — this host in development. */
export function usePublicSiteOrigin(): string {
  const data = useRouteLoaderData('routes/app/layout') as LayoutData | undefined;
  return data?.publicSiteOrigin ?? '';
}

/**
 * The workspace named by the URL. `null` while the account is still loading, or
 * when the slug belongs to no workspace this account can reach — callers treat
 * that as no access rather than falling back to another identity.
 */
export function useActiveWorkspace(): { workspace: Workspace | null; slug?: string } {
  const { workspace: slug } = useParams();
  const workspaces = useWorkspaces();

  return { workspace: workspaces.find((candidate) => candidate.slug === slug) ?? null, slug };
}

/**
 * Builds links inside the current workspace: `path('/health')` →
 * `/app/acme/health`. Falls back to the first workspace on pages that sit
 * outside the workspace segment, such as account settings.
 */
export function useWorkspacePath() {
  const { workspace } = useActiveWorkspace();
  const workspaces = useWorkspaces();
  const slug = workspace?.slug ?? workspaces[0]?.slug;

  return (path = '') => (slug ? `/app/${slug}${path}` : '/app');
}

/** Where to send someone who asks for `/app` with no workspace named. */
export function readLastUsedSlug(): string | null {
  try {
    return localStorage.getItem(LAST_USED_KEY);
  } catch {
    return null;
  }
}

export function rememberLastUsedSlug(slug: string) {
  try {
    localStorage.setItem(LAST_USED_KEY, slug);
  } catch {
    // A preference, not the truth — the URL stays authoritative either way.
  }
}
