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
import { toCapitalised } from '@ownlane/ui/lib/text';
import { useFetcher, useNavigate } from 'react-router';

import type { Workspace } from '../lib/workspaces';

type DeleteBrandDialogProps = {
  workspace: Workspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DeleteBrandResult = { deleted?: string; error?: string };

/**
 * Deleting takes the profile, links, connections and sync history with it, so
 * the name has to be typed back — a click alone is too cheap for this.
 */
export function DeleteBrandDialog({ workspace, open, onOpenChange }: DeleteBrandDialogProps) {
  const fetcher = useFetcher<DeleteBrandResult>();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState('');

  const pending = fetcher.state !== 'idle';
  const error = fetcher.data?.error;
  const deleted = fetcher.data?.deleted;
  const matches = confirmation.trim() === workspace.name;

  // Handled once per outcome, not once per render.
  const announced = useRef<string | null>(null);
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (!deleted || announced.current === deleted) return;
    announced.current = deleted;

    toast.success(`${deleted} was deleted`, {
      description: 'Its profile, links and connections went with it.',
    });
    setConfirmation('');
    onOpenChange(false);
    navigate('/app');
  }, [deleted, navigate, onOpenChange]);

  useEffect(() => {
    if (!error || reported.current === error) return;
    reported.current = error;
    toast.error('Could not delete that brand', { description: error });
  }, [error]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-medium tracking-[-0.01em] break-words">
            Delete {toCapitalised(workspace.name)}
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed">
            This removes the brand's profile, links, connected accounts and sync history. It cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        <fetcher.Form
          action="/app/brands/delete"
          className="space-y-4"
          method="post"
          onSubmit={() => {
            reported.current = null;
          }}
        >
          <input name="slug" type="hidden" value={workspace.slug} />

          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-foreground/80" htmlFor="confirmation">
              Type the brand name to confirm
            </Label>
            <p className="overflow-x-auto rounded-md border border-border/70 bg-muted/60 px-2.5 py-1.5 font-mono text-[12.5px] [overflow-wrap:anywhere]">
              {workspace.name}
            </p>
            <Input
              autoComplete="off"
              className="h-10 text-[14px]"
              disabled={pending}
              id="confirmation"
              name="confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              value={confirmation}
            />
          </div>

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
              className="h-9 text-[13.5px]"
              disabled={pending || !matches}
              type="submit"
              variant="destructive"
            >
              {pending ? 'Deleting…' : 'Delete brand'}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
