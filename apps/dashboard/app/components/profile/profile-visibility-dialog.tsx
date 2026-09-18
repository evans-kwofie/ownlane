import { Button } from '@ownlane/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ownlane/ui/components/dialog';

type ProfileVisibilityDialogProps = {
  currentVisibility: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (visibility: 'public' | 'private') => void;
};

/** Confirms the consequential change before it is added to the profile draft. */
export function ProfileVisibilityDialog({
  currentVisibility,
  open,
  onOpenChange,
  onConfirm,
}: ProfileVisibilityDialogProps) {
  const makingPublic = currentVisibility !== 'public';
  const nextVisibility = makingPublic ? 'public' : 'private';

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-medium tracking-[-0.01em]">
            {makingPublic ? 'Make profile public?' : 'Make profile private?'}
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed">
            {makingPublic
              ? 'Anyone with the address will be able to read your profile, including its bios, links, and published contact details. Search engines may index it.'
              : 'Your profile will no longer be available publicly. Only people in this workspace will be able to see it.'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button className="h-9 text-[13.5px]" onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            className="h-9 text-[13.5px]"
            onClick={() => {
              onConfirm(nextVisibility);
              onOpenChange(false);
            }}
            type="button"
            variant={makingPublic ? 'default' : 'destructive'}
          >
            {makingPublic ? 'Make public' : 'Make private'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
