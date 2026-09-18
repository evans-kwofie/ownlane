import { Link } from 'react-router';
import { Button } from '@ownlane/ui/components/button';
import { OwnlaneMark } from '@ownlane/ui/components/ownlane-mark';

/** Shown when a URL names a workspace this account cannot reach. */
export function NoWorkspaceAccess({ slug }: { slug?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-6 text-foreground">
      <div className="max-w-[380px] text-center">
        <OwnlaneMark className="mx-auto size-7 text-ownlane-orange" variant="open" />
        <h1 className="mt-6 text-[19px] font-medium tracking-[-0.02em]">
          No access to this workspace
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          {slug ? (
            <>
              Nothing here belongs to you under <span className="text-foreground">{slug}</span>. It
              may have been renamed, or you may need an invitation.
            </>
          ) : (
            'That workspace does not exist, or you need an invitation to reach it.'
          )}
        </p>
        <Button
          asChild
          className="mt-6 h-9 bg-foreground text-[13.5px] text-background hover:bg-foreground/90"
        >
          <Link to="/app">Go to your workspace</Link>
        </Button>
      </div>
    </main>
  );
}
