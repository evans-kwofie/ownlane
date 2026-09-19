import { redirect } from 'react-router';

import type { Route } from './+types/link-editor';

/** Legacy deep links now resolve to the single-surface Links editor. */
export function loader({ params }: Route.LoaderArgs) {
  throw redirect(`/app/${encodeURIComponent(params.workspace)}/links`);
}

export default function LegacyLinkEditorRedirect() {
  return null;
}
