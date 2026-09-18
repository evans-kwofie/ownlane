import { AuthenticateWithRedirectCallback } from '@clerk/react-router';
import { OwnlaneMark } from '@ownlane/ui/components/ownlane-mark';
import { Spinner } from '@ownlane/ui/components/spinner';

import type { Route } from './+types/continue';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Signing you in — Ownlane' }, { name: 'robots', content: 'noindex' }];
}

/**
 * Landing point when someone comes back from an external provider. This is a
 * hand-off, not a step: no card, just the mark and a line of reassurance while
 * the session is created. The callback component is headless and renders
 * nothing — it finishes the handshake and redirects.
 */
export default function Continue() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 px-6 text-foreground">
      <OwnlaneMark className="size-7 text-ownlane-orange" variant="open" />

      <div aria-live="polite" className="flex flex-col items-center gap-4">
        <Spinner className="size-6 text-foreground/70" label="Signing you in" />
        <div className="text-center">
          <p className="text-[15px] font-medium tracking-[-0.01em]">Signing you in</p>
          <p className="mt-1 text-[13px] text-muted-foreground">This only takes a second.</p>
        </div>
      </div>

      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/app"
        signUpFallbackRedirectUrl="/app"
      />
    </main>
  );
}
