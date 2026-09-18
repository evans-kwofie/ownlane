import {
  CopyIcon,
  Delete02Icon,
  Image01Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Badge } from '@ownlane/ui/components/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ownlane/ui/components/dropdown-menu';
import { cn } from '@ownlane/ui/lib/utils';

import { KIND_LABELS } from '../lib/assets';

import type { AssetRecord } from '../lib/assets.server';

const USE_LABELS: Record<NonNullable<AssetRecord['usedAs']>, string> = {
  avatar: 'Profile photo',
  logo: 'Logo',
  cover: 'Cover',
};

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type AssetTileProps = {
  asset: AssetRecord;
  onOpen: () => void;
  onUse: (as: 'avatar' | 'logo' | 'cover') => void;
  /** Opens the details dialog: name, kind, notes, alt text. */
  onRename: () => void;
  onDelete: () => void;
  onCopy: () => void;
};

/**
 * One asset in the library. The image is the subject, so the frame stays quiet
 * and everything else waits for a hover or the keyboard.
 */
export function AssetTile({ asset, onOpen, onUse, onRename, onDelete, onCopy }: AssetTileProps) {
  const dimensions = asset.width && asset.height ? `${asset.width} × ${asset.height}` : null;

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border/70 bg-card transition-colors hover:border-border">
      <button
        className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        onClick={onOpen}
        type="button"
      >
        {/* A chequerboard reads through transparent logos, which a flat fill hides. */}
        <span
          className="block aspect-square w-full bg-muted"
          style={{
            backgroundImage:
              'linear-gradient(45deg, rgba(0,0,0,0.045) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.045) 75%), linear-gradient(45deg, rgba(0,0,0,0.045) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.045) 75%)',
            backgroundPosition: '0 0, 9px 9px',
            backgroundSize: '18px 18px',
          }}
        >
          <img
            alt={asset.originalName ?? ''}
            className="size-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            src={`/assets/${asset.id}`}
          />
        </span>
      </button>

      {asset.usedAs ? (
        <Badge
          className="absolute left-2 top-2 gap-1 bg-background/90 text-[11px] font-medium backdrop-blur"
          variant="outline"
        >
          <HugeiconsIcon icon={Image01Icon} size={11} strokeWidth={1.5} />
          {USE_LABELS[asset.usedAs]}
        </Badge>
      ) : null}

      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">
            {asset.title || asset.originalName || 'Untitled'}
          </p>
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {[KIND_LABELS[asset.kind], dimensions, formatBytes(asset.bytes)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${asset.originalName ?? 'this asset'}`}
            className={cn(
              'shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              'opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100',
            )}
          >
            <HugeiconsIcon icon={MoreVerticalIcon} size={15} strokeWidth={1.5} />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[190px] text-[13px]">
            <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/70">
              Use as
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => onUse('avatar')}>Profile photo</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUse('logo')}>Logo</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUse('cover')}>Cover image</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onCopy}>
              <HugeiconsIcon icon={CopyIcon} size={14} strokeWidth={1.5} />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRename}>
              <HugeiconsIcon icon={PencilEdit02Icon} size={14} strokeWidth={1.5} />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} variant="destructive">
              <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.5} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
