import { redirect } from 'react-router';

import type { Route } from './+types/collection-editor';

/** Collections are edited in a sheet on the main Links editor. */
export function loader({ params }: Route.LoaderArgs) {
  throw redirect(`/app/${encodeURIComponent(params.workspace)}/links`);
}

export default function LegacyCollectionEditorRedirect() {
  return null;
}
