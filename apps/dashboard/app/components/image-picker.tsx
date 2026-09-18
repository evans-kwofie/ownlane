import { useRef, useState } from 'react';
import { Image01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@ownlane/ui/components/button';
import { FormSheet } from '@ownlane/ui/components/form-sheet';
import { toast } from '@ownlane/ui/components/sonner';
import { useFetcher } from 'react-router';

type LibraryAsset = {
  id: string;
  contentType: string;
  originalName: string | null;
  title: string | null;
};

type ImagePickerProps = {
  /** Current asset id, if one is set. */
  assetId: string;
  label: string;
  /** Square for avatars and logos; wide for covers. */
  shape?: 'square' | 'wide';
  field: 'avatar' | 'cover' | 'logo';
  /** Existing image assets that can be assigned without uploading another copy. */
  assets: LibraryAsset[];
};

const OUTPUT_SIZE = 1024;
/** Platforms reject small images, so refuse them here rather than at sync. */
const MIN_SOURCE = 200;

/**
 * Picks an image, crops it in the browser, and uploads the result. Cropping
 * client-side keeps one canonical square without an image service — the
 * per-platform safe areas arrive with Connections.
 */
export function ImagePicker({ assetId, assets, label, shape = 'square', field }: ImagePickerProps) {
  const fetcher = useFetcher<{ error?: string; assetId?: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [open, setOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const aspect = shape === 'wide' ? 3 : 1;
  const pending = fetcher.state !== 'idle' || busy;

  async function choose(file: File) {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);

      if (image.naturalWidth < MIN_SOURCE || image.naturalHeight < MIN_SOURCE) {
        toast.error('That image is too small', {
          description: `Platforms need at least ${MIN_SOURCE}×${MIN_SOURCE}. This one is ${image.naturalWidth}×${image.naturalHeight}.`,
        });
        return;
      }

      setSource(image);
      setZoom(1);
      setOpen(true);
      requestAnimationFrame(() => draw(image, 1));
    };

    image.onerror = () => toast.error('That file could not be read as an image');
    image.src = url;
  }

  function draw(image: HTMLImageElement, scale: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = OUTPUT_SIZE;
    const height = Math.round(OUTPUT_SIZE / aspect);
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, width, height);

    // Cover the frame, then apply the zoom on top.
    const base = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawn = base * scale;
    const drawnWidth = image.naturalWidth * drawn;
    const drawnHeight = image.naturalHeight * drawn;

    context.drawImage(
      image,
      (width - drawnWidth) / 2,
      (height - drawnHeight) / 2,
      drawnWidth,
      drawnHeight,
    );
  }

  async function upload() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setBusy(true);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.92),
    );

    if (!blob) {
      setBusy(false);
      toast.error('That image could not be prepared');
      return;
    }

    const form = new FormData();
    form.append('intent', 'image');
    form.append('field', field);
    form.append('file', new File([blob], `${field}.webp`, { type: 'image/webp' }));
    form.append('width', String(canvas.width));
    form.append('height', String(canvas.height));

    fetcher.submit(form, { method: 'post', encType: 'multipart/form-data' });
    setBusy(false);
    setOpen(false);
  }

  return (
    <>
      <button
        className="group relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-input bg-muted/60 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        onClick={() => setLibraryOpen(true)}
        title={`Change ${label.toLowerCase()}`}
        type="button"
      >
        {assetId ? (
          <img alt="" className="size-full object-cover" src={`/assets/${assetId}`} />
        ) : (
          <HugeiconsIcon icon={Image01Icon} size={18} strokeWidth={1.5} />
        )}
      </button>

      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void choose(file);
          event.target.value = '';
        }}
        ref={inputRef}
        type="file"
      />

      <FormSheet
        description="Drag the zoom to frame it. The square is what platforms receive."
        footer={
          <>
            <Button
              className="h-9 text-[13.5px]"
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="h-9 bg-foreground text-[13.5px] text-background hover:bg-foreground/90"
              disabled={pending}
              onClick={upload}
              type="button"
            >
              {pending ? 'Uploading…' : `Use this ${label.toLowerCase()}`}
            </Button>
          </>
        }
        onOpenChange={setOpen}
        open={open}
        title={`Crop your ${label.toLowerCase()}`}
      >
        <div className="space-y-3 pb-1">
          <canvas
            className={
              shape === 'wide'
                ? 'aspect-[3/1] w-full rounded-md border border-border/70 bg-muted object-cover'
                : 'mx-auto aspect-square w-48 rounded-full border border-border/70 bg-muted object-cover'
            }
            ref={canvasRef}
          />
          <label
            className="flex items-center gap-3 text-[12.5px] text-muted-foreground"
            htmlFor={`zoom-${field}`}
          >
            Zoom
            <input
              className="flex-1 accent-ownlane-orange"
              id={`zoom-${field}`}
              max="3"
              min="1"
              onChange={(event) => {
                const next = Number(event.target.value);
                setZoom(next);
                if (source) draw(source, next);
              }}
              step="0.01"
              type="range"
              value={zoom}
            />
          </label>
        </div>
      </FormSheet>

      <FormSheet
        description="Use an image you have already uploaded, or add a new one. Choosing an existing image does not create a copy."
        footer={<Button className="h-9 text-[13.5px]" onClick={() => { setLibraryOpen(false); inputRef.current?.click(); }} type="button" variant="outline">Upload new image</Button>}
        onOpenChange={setLibraryOpen}
        open={libraryOpen}
        title={`Choose ${label.toLowerCase()}`}
      >
        {assets.filter((asset) => asset.contentType.startsWith('image/')).length ? (
          <div className="grid max-h-[360px] grid-cols-3 gap-3 overflow-y-auto pb-1">
            {assets.filter((asset) => asset.contentType.startsWith('image/')).map((asset) => (
              <button
                className="group overflow-hidden rounded-lg border border-border bg-muted text-left transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={asset.id}
                onClick={() => {
                  fetcher.submit({ intent: 'select-image', field, assetId: asset.id }, { method: 'post' });
                  setLibraryOpen(false);
                }}
                type="button"
              >
                <img alt="" className="aspect-square w-full object-cover" src={`/assets/${asset.id}`} />
                <span className="block truncate px-2 py-1.5 text-[11px] font-medium">{asset.title || asset.originalName || 'Untitled image'}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">No images in this asset library yet. Upload one to use it here.</p>
        )}
      </FormSheet>
    </>
  );
}
