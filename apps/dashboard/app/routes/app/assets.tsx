import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuth } from '@clerk/react-router/server';
import { CloudUploadIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
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
import { Tabs, TabsList, TabsTrigger } from '@ownlane/ui/components/tabs';
import { cn } from '@ownlane/ui/lib/utils';
import { data, redirect, useFetcher } from 'react-router';

import { AssetDetailsDialog } from '../../components/asset-details-dialog';
import { AssetTile, formatBytes } from '../../components/asset-tile';
import { UploadDialog, type StagedUpload } from '../../components/upload-dialog';
import { EmptyState } from '../../components/empty-state';
import { KIND_LABELS, type AssetKind } from '../../lib/assets';
import { PageHeader } from '../../components/page-header';
import { cloudflare } from '../../lib/cloudflare';
import {
  deleteAsset,
  listAssets,
  describeAsset,
  setProfileImage,
  storeImage,
  type AssetRecord,
} from '../../lib/assets.server';
import { getWorkspaceForUser } from '../../lib/workspaces.server';
import type { Route } from './+types/assets';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Assets — Ownlane' }];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');

  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');

  return { assets: await listAssets(env.DB, workspace.id) };
}

/** Upload, use, rename and delete all pass through here with an intent. */
export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) throw redirect('/');

  const { env } = args.context.get(cloudflare);
  const workspace = await getWorkspaceForUser(env.DB, userId, args.params.workspace);
  if (!workspace) throw redirect('/app');

  const form = await args.request.formData();
  const intent = String(form.get('intent') ?? 'upload');
  const stamp = Date.now();

  if (intent === 'upload') {
    const files = form.getAll('file').filter((entry): entry is File => entry instanceof File);
    if (!files.length) return data({ error: 'Choose an image to upload.' }, { status: 400 });

    const failures: string[] = [];
    let stored = 0;

    for (const [index, file] of files.entries()) {
      const { error } = await storeImage(env, {
        file,
        workspaceId: workspace.id,
        kind: (String(form.get(`kind-${index}`) ?? 'image') as AssetKind) || 'image',
        title: String(form.get(`title-${index}`) ?? '').trim() || undefined,
        altText: String(form.get(`alt-${index}`) ?? '').trim() || undefined,
      });

      if (error) failures.push(`${file.name}: ${error}`);
      else stored += 1;
    }

    if (!stored) return data({ error: failures[0] ?? 'Nothing was uploaded.' }, { status: 400 });

    return {
      stamp,
      message: `${stored} ${stored === 1 ? 'asset' : 'assets'} uploaded`,
      warning: failures.length ? `${failures.length} skipped — ${failures[0]}` : undefined,
    };
  }

  const assetId = String(form.get('assetId') ?? '');

  if (intent === 'delete') {
    const { error } = await deleteAsset(env, workspace.id, assetId);
    if (error) return data({ error }, { status: 400 });

    return { stamp, message: 'Asset deleted' };
  }

  if (intent === 'describe') {
    await describeAsset(env.DB, workspace.id, assetId, {
      title: String(form.get('title') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
      altText: String(form.get('altText') ?? '').trim(),
      kind: String(form.get('kind') ?? 'image') as AssetKind,
    });

    return { stamp, message: 'Details saved' };
  }

  if (intent === 'use') {
    const as = String(form.get('as'));
    const column = ({ avatar: 'avatar_key', logo: 'logo_key', cover: 'cover_key' } as const)[
      as as 'avatar' | 'logo' | 'cover'
    ];

    if (!column) return data({ error: 'Unknown image slot.' }, { status: 400 });

    const profile = await env.DB.prepare('SELECT id FROM profiles WHERE workspace_id = ?1')
      .bind(workspace.id)
      .first<{ id: string }>();

    if (!profile) return data({ error: 'This workspace has no profile yet.' }, { status: 400 });

    await setProfileImage(env.DB, profile.id, column, assetId);

    return { stamp, message: as === 'avatar' ? 'Set as profile photo' : `Set as ${as}` };
  }

  return data({ error: 'Unknown action.' }, { status: 400 });
}

type Filter = 'all' | 'in-use' | 'unused';

export default function Assets({ loaderData }: Route.ComponentProps) {
  const { assets } = loaderData;
  const fetcher = useFetcher<{
    stamp?: number;
    message?: string;
    warning?: string;
    error?: string;
  }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const announced = useRef<number | string | null>(null);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<File[]>([]);
  const [describing, setDescribing] = useState<AssetRecord | null>(null);
  const [deleting, setDeleting] = useState<AssetRecord | null>(null);

  const pending = fetcher.state !== 'idle';

  useEffect(() => {
    const key = fetcher.data?.stamp ?? fetcher.data?.error;
    if (!key || announced.current === key) return;

    announced.current = key;

    if (fetcher.data?.error) toast.error(fetcher.data.error);
    else if (fetcher.data?.message)
      toast.success(fetcher.data.message, { description: fetcher.data.warning });
  }, [fetcher.data]);

  function upload(entries: StagedUpload[]) {
    const form = new FormData();
    form.append('intent', 'upload');

    entries.forEach((entry, index) => {
      form.append('file', entry.file);
      form.append(`title-${index}`, entry.title);
      form.append(`kind-${index}`, entry.kind);
      form.append(`alt-${index}`, entry.altText);
    });

    fetcher.submit(form, { encType: 'multipart/form-data', method: 'post' });
    setStaged([]);
  }

  function send(fields: Record<string, string>) {
    fetcher.submit(fields, { method: 'post' });
  }

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();

    return assets.filter((asset) => {
      if (filter === 'in-use' && !asset.usedAs) return false;
      if (filter === 'unused' && asset.usedAs) return false;
      if (!term) return true;

      return (asset.originalName ?? '').toLowerCase().includes(term);
    });
  }, [assets, filter, query]);

  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  const missingAlt = assets.filter((asset) => !asset.altText).length;

  return (
    <div
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setDragging(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files.length) setStaged(Array.from(event.dataTransfer.files));
      }}
    >
      <PageHeader
        action={
          <Button
            className="h-9 gap-1.5 bg-foreground text-[13px] text-background hover:bg-foreground/90"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <HugeiconsIcon icon={CloudUploadIcon} size={15} strokeWidth={1.5} />
            {pending ? 'Uploading…' : 'Upload'}
          </Button>
        }
        description="The images your profile, public site and connected platforms draw from. Upload once; every platform takes the size it needs."
        title="Assets"
      />

      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        multiple
        onChange={(event) => {
          if (event.target.files?.length) setStaged(Array.from(event.target.files));
          event.target.value = '';
        }}
        ref={inputRef}
        type="file"
      />

      {assets.length ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
            <Tabs onValueChange={(value) => setFilter(value as Filter)} value={filter}>
              <TabsList className="h-8">
                <TabsTrigger className="text-[12.5px]" value="all">
                  All {assets.length}
                </TabsTrigger>
                <TabsTrigger className="text-[12.5px]" value="in-use">
                  In use
                </TabsTrigger>
                <TabsTrigger className="text-[12.5px]" value="unused">
                  Unused
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative">
              <HugeiconsIcon
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                icon={Search01Icon}
                size={14}
                strokeWidth={1.5}
              />
              <Input
                aria-label="Search assets"
                className="h-8 w-[200px] pl-8 text-[13px]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name"
                value={query}
              />
            </div>
          </div>

          {shown.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((asset) => (
                <AssetTile
                  asset={asset}
                  key={asset.id}
                  onCopy={() => {
                    void navigator.clipboard.writeText(
                      `${window.location.origin}/assets/${asset.id}`,
                    );
                    toast.success('Link copied');
                  }}
                  onDelete={() => setDeleting(asset)}
                  onOpen={() => window.open(`/assets/${asset.id}`, '_blank')}
                  onRename={() => setDescribing(asset)}
                  onUse={(as) => send({ intent: 'use', assetId: asset.id, as })}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-6 py-14 text-center text-[13.5px] text-muted-foreground">
              Nothing matches that.
            </p>
          )}

          <p className="pt-6 text-[12px] text-muted-foreground">
            {assets.length} {assets.length === 1 ? 'asset' : 'assets'} · {formatBytes(totalBytes)}{' '}
            stored
            {missingAlt ? ` · ${missingAlt} without alt text` : ''}
          </p>
        </>
      ) : (
        <EmptyState
          action={
            <Button
              className="bg-foreground text-background hover:bg-foreground/90"
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              Upload your first asset
            </Button>
          }
          description="Drop a headshot, logo or cover image here. Ownlane keeps the original so each platform can take the size it needs."
          title="Your asset library is empty"
        />
      )}

      {/* Dropping anywhere on the page uploads, so the target is the page. */}
      {dragging ? (
        <div
          className={cn(
            'pointer-events-none fixed inset-0 z-40 flex items-center justify-center',
            'bg-background/70 backdrop-blur-[1px]',
          )}
        >
          <p className="rounded-xl border-2 border-dashed border-ownlane-orange bg-background px-6 py-4 text-[14px] font-medium">
            Drop to upload
          </p>
        </div>
      ) : null}

      <UploadDialog
        files={staged}
        onCancel={() => setStaged([])}
        onUpload={upload}
        pending={pending}
      />

      <AssetDetailsDialog
        asset={describing}
        onClose={() => setDescribing(null)}
        onSave={(fields) => {
          if (describing) send({ intent: 'describe', assetId: describing.id, ...fields });
          setDescribing(null);
        }}
      />

      <Dialog onOpenChange={(open) => !open && setDeleting(null)} open={Boolean(deleting)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-medium tracking-[-0.01em]">
              Delete this asset?
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed">
              {deleting?.usedAs
                ? 'It is in use on your profile. Deleting it removes the file and clears it from the profile.'
                : 'The file is removed for good. Anything already published with it keeps its own copy.'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              className="h-9 text-[13.5px]"
              onClick={() => setDeleting(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="h-9 text-[13.5px]"
              onClick={() => {
                if (deleting) send({ intent: 'delete', assetId: deleting.id });
                setDeleting(null);
              }}
              type="button"
              variant="destructive"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
