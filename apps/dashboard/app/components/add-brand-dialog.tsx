import { useEffect, useRef, useState } from 'react';
import { Button } from '@ownlane/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ownlane/ui/components/dialog';
import { Input } from '@ownlane/ui/components/input';
import { Label } from '@ownlane/ui/components/label';
import { toast } from '@ownlane/ui/components/sonner';
import { useFetcher, useNavigate } from 'react-router';

type AddBrandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type CreateBrandResult = { slug?: string; error?: string };

/**
 * Adding an identity is a small decision, so it stays in place rather than
 * sending someone to a page and back. On success we switch into the new brand,
 * which is almost always what someone wants next.
 */
export function AddBrandDialog({ open, onOpenChange }: AddBrandDialogProps) {
  const fetcher = useFetcher<CreateBrandResult>();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const pending = fetcher.state !== 'idle';
  // A submission that comes back idle with nothing at all means the request
  // never reached the action — a stale server, or a route that moved.
  const silentFailure = submitted && !pending && !fetcher.data;
  const error =
    fetcher.data?.error ??
    (silentFailure
      ? 'The server did not answer. Restart the dev server and try again.'
      : undefined);
  const createdSlug = fetcher.data?.slug;

  // The effect re-runs whenever the parent re-renders, so each outcome is
  // handled exactly once rather than once per render.
  const announced = useRef<string | null>(null);

  useEffect(() => {
    if (!createdSlug || announced.current === createdSlug) return;
    announced.current = createdSlug;

    // The dialog closes and the page changes, so the confirmation has to
    // outlive both.
    toast.success(`${name || 'Your brand'} is ready`, {
      description: `Now working in /app/${createdSlug}`,
    });
    setName('');
    setSubmitted(false);
    onOpenChange(false);
    navigate(`/app/${createdSlug}`);
  }, [createdSlug, name, navigate, onOpenChange]);

  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (!error || reported.current === error) return;
    reported.current = error;
    toast.error('Could not add that brand', { description: error });
  }, [error]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-medium tracking-[-0.01em] break-words">
            Add a brand
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed">
            A brand is a separate identity with its own profile, public site, links and connections.
            You can switch between brands at any time.
          </DialogDescription>
        </DialogHeader>

        <fetcher.Form
          action="/app/brands/new"
          className="space-y-4"
          method="post"
          onSubmit={() => {
            reported.current = null;
            setSubmitted(true);
          }}
        >
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-foreground/80" htmlFor="brand-name">
              Brand name
            </Label>
            <Input
              autoFocus
              className="h-10 text-[14px]"
              disabled={pending}
              id="brand-name"
              maxLength={60}
              name="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme Studio"
              required
              value={name}
            />
            <p className="text-[12px] text-muted-foreground">
              Its address is made from this name, and can be changed later.
            </p>
          </div>

          {error ? (
            <p className="text-[13px] leading-relaxed text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              className="h-9 text-[13.5px]"
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="h-9 bg-foreground text-[13.5px] text-background hover:bg-foreground/90"
              disabled={pending || !name.trim()}
              type="submit"
            >
              {pending ? 'Adding…' : 'Add brand'}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
