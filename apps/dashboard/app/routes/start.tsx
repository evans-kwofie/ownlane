import { redirect } from 'react-router';

import { onboardingHandleCookie } from '../lib/onboarding.server';
import { toSlug } from '../lib/workspaces';
import type { Route } from './+types/start';

export function loader(args: Route.LoaderArgs) {
  const raw = new URL(args.request.url).searchParams.get('handle')?.trim() ?? '';
  const handle = raw ? toSlug(raw).slice(0, 30) : '';
  const headers = new Headers();

  if (handle.length >= 2) {
    headers.set('Set-Cookie', onboardingHandleCookie(args.request, handle));
  } else {
    headers.set('Set-Cookie', onboardingHandleCookie(args.request));
  }

  return redirect('/', { headers });
}
