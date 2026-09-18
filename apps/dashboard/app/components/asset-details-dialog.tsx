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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ownlane/ui/components/select';
import { Textarea } from '@ownlane/ui/components/textarea';

import { ASSET_KINDS, ASSET_LIMITS, KIND_HINTS, KIND_LABELS, type AssetKind } from '../lib/assets';
import type { AssetRecord } from '../lib/assets.server';

type AssetDetailsDialogProps = {
  asset: AssetRecord | null;
  onClose: () => void;
  onSave: (fields: {
    title: string;
    description: string;
    altText: string;
    kind: AssetKind;
  }) => void;
};

/**
 * What an asset is, in the words of whoever will pick it next. Alt text is kept
 * separate from the description because it is published, not private guidance.
 */
export function AssetDetailsDialog({ asset, onClose, onSave }: AssetDetailsDialogProps) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(asset)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-medium tracking-[-0.01em]">
            Asset details
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed">
            Uploaded as{' '}
            <span className="font-mono text-[12.5px] text-foreground">
              {asset?.originalName ?? 'an unnamed file'}
            </span>
            . That filename is kept as it is.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          id="asset-details"
          key={asset?.id}
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);

            onSave({
              title: String(form.get('title') ?? ''),
              description: String(form.get('description') ?? ''),
              altText: String(form.get('altText') ?? ''),
              kind: String(form.get('kind') ?? 'image') as AssetKind,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-foreground/80" htmlFor="asset-title">
              Name
            </Label>
            <Input
              autoFocus
              className="h-10 text-[14px]"
              defaultValue={asset?.title ?? ''}
              id="asset-title"
              maxLength={ASSET_LIMITS.title}
              name="title"
              placeholder="Headshot, dark background"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-foreground/80" htmlFor="asset-kind">
              Kind
            </Label>
            <Select defaultValue={asset?.kind ?? 'image'} name="kind">
              <SelectTrigger className="h-10 w-full text-[14px]" id="asset-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    <span className="flex flex-col items-start">
                      <span className="text-[13.5px]">{KIND_LABELS[kind]}</span>
                      <span className="text-[11.5px] text-muted-foreground">
                        {KIND_HINTS[kind]}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              className="text-[13px] font-medium text-foreground/80"
              htmlFor="asset-description"
            >
              Notes
            </Label>
            <Textarea
              className="min-h-20 text-[14px]"
              defaultValue={asset?.description ?? ''}
              id="asset-description"
              maxLength={ASSET_LIMITS.description}
              name="description"
              placeholder="Use on dark backgrounds only. Shot by Ama, March 2026."
            />
            <p className="text-[12px] text-muted-foreground">
              For whoever picks this next. Never published.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-foreground/80" htmlFor="asset-alt">
              Alt text
            </Label>
            <Input
              className="h-10 text-[14px]"
              defaultValue={asset?.altText ?? ''}
              id="asset-alt"
              maxLength={ASSET_LIMITS.altText}
              name="altText"
              placeholder="Evans Kwofie, smiling, against a dark grey wall"
            />
            <p className="text-[12px] text-muted-foreground">
              Published with the image, and what platforms ask for. Describe what is in it.
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button className="h-9 text-[13.5px]" onClick={onClose} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            className="h-9 bg-foreground text-[13.5px] text-background hover:bg-foreground/90"
            form="asset-details"
            type="submit"
          >
            Save details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
