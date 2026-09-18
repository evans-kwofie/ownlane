import { useEffect, useState } from 'react';
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

import {
  ASSET_KINDS,
  ASSET_LIMITS,
  KIND_LABELS,
  titleFromFilename,
  type AssetKind,
} from '../lib/assets';

export type StagedUpload = { file: File; title: string; kind: AssetKind; altText: string };

type UploadDialogProps = {
  files: File[];
  pending: boolean;
  onCancel: () => void;
  onUpload: (entries: StagedUpload[]) => void;
};

/**
 * Metadata is asked for before the file is stored, not after. Anything captured
 * later is captured never — which is why libraries fill up with IMG_4821 and no
 * alt text.
 */
export function UploadDialog({ files, pending, onCancel, onUpload }: UploadDialogProps) {
  const [entries, setEntries] = useState<StagedUpload[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    setEntries(
      files.map((file) => ({
        file,
        title: titleFromFilename(file.name),
        kind: guessKind(file.name),
        altText: '',
      })),
    );

    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function update(index: number, patch: Partial<StagedUpload>) {
    setEntries((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  }

  const missingAlt = entries.filter((entry) => !entry.altText.trim()).length;

  return (
    <Dialog onOpenChange={(open) => !open && onCancel()} open={files.length > 0}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-medium tracking-[-0.01em]">
            {files.length === 1 ? 'Add this image' : `Add ${files.length} images`}
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed">
            Names are taken from the filenames. Alt text is published with the image and is what
            platforms ask for.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
          {entries.map((entry, index) => (
            <div className="flex gap-3" key={`${entry.file.name}-${index}`}>
              <img
                alt=""
                className="size-16 shrink-0 rounded-lg border border-border/70 bg-muted object-cover"
                src={previews[index]}
              />

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label className="text-[12px] text-muted-foreground" htmlFor={`title-${index}`}>
                      Name
                    </Label>
                    <Input
                      className="h-9 text-[13.5px]"
                      id={`title-${index}`}
                      maxLength={ASSET_LIMITS.title}
                      onChange={(event) => update(index, { title: event.target.value })}
                      value={entry.title}
                    />
                  </div>

                  <div className="w-[116px] shrink-0 space-y-1">
                    <Label className="text-[12px] text-muted-foreground" htmlFor={`kind-${index}`}>
                      Kind
                    </Label>
                    <Select
                      onValueChange={(value) => update(index, { kind: value as AssetKind })}
                      value={entry.kind}
                    >
                      <SelectTrigger
                        className="h-9 w-full text-[13.5px]"
                        id={`kind-${index}`}
                        size="sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_KINDS.map((kind) => (
                          <SelectItem className="text-[13.5px]" key={kind} value={kind}>
                            {KIND_LABELS[kind]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[12px] text-muted-foreground" htmlFor={`alt-${index}`}>
                    Alt text
                  </Label>
                  <Input
                    className="h-9 text-[13.5px]"
                    id={`alt-${index}`}
                    maxLength={ASSET_LIMITS.altText}
                    onChange={(event) => update(index, { altText: event.target.value })}
                    placeholder="Describe what is in the image"
                    value={entry.altText}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-[12px] text-muted-foreground">
            {missingAlt ? `${missingAlt} without alt text — you can add it later` : 'All described'}
          </p>
          <div className="flex gap-2">
            <Button
              className="h-9 text-[13.5px]"
              onClick={onCancel}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="h-9 bg-foreground text-[13.5px] text-background hover:bg-foreground/90"
              disabled={pending}
              onClick={() => onUpload(entries)}
              type="button"
            >
              {pending
                ? 'Uploading…'
                : `Upload ${entries.length === 1 ? 'image' : `${entries.length} images`}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A file called "logo" is probably a logo; the picker can be corrected. */
function guessKind(filename: string): AssetKind {
  const name = filename.toLowerCase();

  if (/logo|mark|wordmark|icon|favicon/.test(name)) return 'logo';
  if (/cover|banner|header|hero/.test(name)) return 'cover';

  return 'image';
}
