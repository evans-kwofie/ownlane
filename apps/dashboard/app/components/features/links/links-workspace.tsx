import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, GripVertical, ImagePlus, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@ownlane/ui/components/button';
import { FormSheet } from '@ownlane/ui/components/form-sheet';
import { Input } from '@ownlane/ui/components/input';
import { Label } from '@ownlane/ui/components/label';
import { Textarea } from '@ownlane/ui/components/textarea';
import { toast } from '@ownlane/ui/components/sonner';
import { useFetcher } from 'react-router';

import { PageHeader } from '../../page-header';
import { AddLinkCatalog, type PlatformSelection } from './add-link-catalog';
import type { AssetRecord } from '../../../lib/assets.server';
import {
  PlatformIcon,
  detectLinkPlatform,
  getLinkPlatform,
  platformColors,
  platformUrl,
} from '../../../features/links/platforms';
import type { ConnectedAccountLinkSuggestion } from '../../../features/links/queries.server';
import type { LinkCollection, ProfileLink } from '../../../features/links/schema';

type Result = { saved?: string; error?: string; fieldErrors?: { label?: string; url?: string } };
type LinkDraft = Partial<ProfileLink> | null | undefined;

export function LinksWorkspace({
  links,
  collections,
  assets,
  connections,
}: {
  links: ProfileLink[];
  collections: LinkCollection[];
  assets: AssetRecord[];
  connections: ConnectedAccountLinkSuggestion[];
}) {
  const mutation = useFetcher<Result>();
  const reorder = useFetcher<Result>();
  const [linkDraft, setLinkDraft] = useState<LinkDraft>();
  const [sectionDraft, setSectionDraft] = useState<LinkCollection | null | undefined>();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogCollectionId, setCatalogCollectionId] = useState<string | null>(null);
  const [orderedLinks, setOrderedLinks] = useState(links);
  const [orderedCollections, setOrderedCollections] = useState(collections);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const collisionDetection: CollisionDetection = (args) => {
    const section = String(args.active.id).startsWith('section:');
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((container) =>
        section
          ? String(container.id).startsWith('section:')
          : !String(container.id).startsWith('section:'),
      ),
    });
  };

  useEffect(() => setOrderedLinks(links), [links]);
  useEffect(() => setOrderedCollections(collections), [collections]);
  useEffect(() => {
    if (mutation.data?.saved) {
      toast.success(mutation.data.saved);
      setLinkDraft(undefined);
      setSectionDraft(undefined);
    }
    if (mutation.data?.error) toast.error(mutation.data.error);
  }, [mutation.data]);
  useEffect(() => {
    if (reorder.data?.error) toast.error(reorder.data.error);
  }, [reorder.data]);

  const grouped = useMemo(
    () =>
      new Map<string | null, ProfileLink[]>(
        [null, ...orderedCollections.map((c) => c.id)].map((id) => [
          id,
          orderedLinks.filter((link) => (link.collectionId ?? null) === id),
        ]),
      ),
    [orderedCollections, orderedLinks],
  );

  function persistLinks(next: ProfileLink[]) {
    setOrderedLinks(next);
    reorder.submit(
      {
        intent: 'reorder-links',
        items: JSON.stringify(
          next.map((link) => ({ id: link.id, collectionId: link.collectionId ?? null })),
        ),
      },
      { method: 'post' },
    );
  }

  function addLink(collectionId: string | null) {
    setCatalogCollectionId(collectionId);
    setCatalogOpen(true);
  }

  function selectPlatform(selection: PlatformSelection) {
    setLinkDraft({ ...selection, collectionId: catalogCollectionId });
  }

  function moveLink(activeId: string, overId: string) {
    if (activeId === overId) return;
    const source = orderedLinks.find((link) => link.id === activeId);
    const target = orderedLinks.find((link) => link.id === overId);
    const collectionId = overId.startsWith('drop:')
      ? overId.slice(5) === 'featured'
        ? null
        : overId.slice(5)
      : (target?.collectionId ?? null);
    if (!source || (!target && !overId.startsWith('drop:'))) return;
    const next = [...orderedLinks];
    const from = next.findIndex((link) => link.id === activeId);
    const moved = { ...next.splice(from, 1)[0], collectionId };
    const to = target
      ? next.findIndex((link) => link.id === overId)
      : next.reduce(
          (last, link, index) => ((link.collectionId ?? null) === collectionId ? index : last),
          -1,
        ) + 1;
    next.splice(to < 0 ? next.length : to, 0, moved);
    persistLinks(next);
  }

  function moveSection(activeId: string, overId: string) {
    if (activeId === overId) return;
    const next = [...orderedCollections];
    const from = next.findIndex((section) => section.id === activeId);
    const to = next.findIndex((section) => section.id === overId);
    if (from < 0 || to < 0) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    setOrderedCollections(next);
    reorder.submit(
      { intent: 'reorder-collections', ids: JSON.stringify(next.map((section) => section.id)) },
      { method: 'post' },
    );
  }

  function dragEnded(event: DragEndEvent) {
    if (!event.over) return;
    const active = String(event.active.id);
    const over = String(event.over.id);
    if (active.startsWith('section:') && over.startsWith('section:'))
      moveSection(active.slice(8), over.slice(8));
    if (active.startsWith('link:'))
      moveLink(active.slice(5), over.startsWith('link:') ? over.slice(5) : over);
  }

  return (
    <>
      <PageHeader
        title="Links"
        description="Shape the paths people can take from your public profile."
        action={
          <div className="flex gap-2">
            <Button onClick={() => setSectionDraft(null)} variant="outline">
              <Plus className="size-4" /> Section
            </Button>
            <Button onClick={() => addLink(null)}>
              <Plus className="size-4" /> Link
            </Button>
          </div>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DndContext collisionDetection={collisionDetection} onDragEnd={dragEnded} sensors={sensors}>
          <main className="space-y-5">
            <EditorSection
              title="Featured links"
              description="Shown before your sections."
              links={grouped.get(null) ?? []}
              collectionId={null}
              onAdd={() => addLink(null)}
              onEdit={setLinkDraft}
            />
            <SortableContext
              items={orderedCollections.map((section) => `section:${section.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {orderedCollections.map((section) => (
                <SortableSectionCard
                  key={section.id}
                  section={section}
                  links={grouped.get(section.id) ?? []}
                  onAdd={() => addLink(section.id)}
                  onEdit={setLinkDraft}
                  onEditSection={() => setSectionDraft(section)}
                />
              ))}
            </SortableContext>
            {!orderedCollections.length ? (
              <button
                className="w-full rounded-2xl border border-dashed border-border p-8 text-center transition-colors hover:bg-accent/30"
                onClick={() => setSectionDraft(null)}
                type="button"
              >
                <span className="mx-auto grid size-9 place-items-center rounded-full bg-muted">
                  <Plus className="size-4" />
                </span>
                <span className="mt-3 block text-sm font-medium">Create your first section</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Group links into a visible chapter of your profile.
                </span>
              </button>
            ) : null}
          </main>
        </DndContext>
        <PublicPreview links={orderedLinks} collections={orderedCollections} />
      </div>
      <LinkSheet
        assets={assets}
        collections={orderedCollections}
        draft={linkDraft}
        mutation={mutation}
        onOpenChange={(open) => !open && setLinkDraft(undefined)}
      />
      <AddLinkCatalog
        connections={connections}
        onOpenChange={setCatalogOpen}
        onSelect={selectPlatform}
        open={catalogOpen}
      />
      <SectionSheet
        draft={sectionDraft}
        mutation={mutation}
        onOpenChange={(open) => !open && setSectionDraft(undefined)}
      />
    </>
  );
}

function EditorSection({
  title,
  description,
  links,
  collectionId,
  onAdd,
  onEdit,
  header,
}: {
  title: string;
  description: string;
  links: ProfileLink[];
  collectionId: string | null;
  onAdd: () => void;
  onEdit: (link: ProfileLink) => void;
  header?: React.ReactNode;
}) {
  const dropId = `drop:${collectionId ?? 'featured'}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-[-0.01em]">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {header}
      </div>
      <div className={`p-2 transition-colors ${isOver ? 'bg-accent/40' : ''}`} ref={setNodeRef}>
        <SortableContext
          items={links.map((link) => `link:${link.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {links.map((link) => (
            <SortableLinkRow key={link.id} link={link} onEdit={() => onEdit(link)} />
          ))}
        </SortableContext>
        {!links.length ? (
          <p className="px-3 py-7 text-center text-xs text-muted-foreground">
            No links in this section yet.
          </p>
        ) : null}
        <Button
          className="mt-1 cursor-pointer text-muted-foreground"
          onClick={onAdd}
          variant="ghost"
        >
          <Plus className="size-4" /> Add link
        </Button>
      </div>
    </section>
  );
}

function SortableSectionCard({
  section,
  links,
  onAdd,
  onEdit,
  onEditSection,
}: {
  section: LinkCollection;
  links: ProfileLink[];
  onAdd: () => void;
  onEdit: (link: ProfileLink) => void;
  onEditSection: () => void;
}) {
  const sortable = useSortable({ id: `section:${section.id}` });
  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.55 : 1,
      }}
    >
      <EditorSection
        title={section.title}
        description={
          section.description || (section.isActive ? 'Visible section' : 'Hidden section')
        }
        links={links}
        collectionId={section.id}
        onAdd={onAdd}
        onEdit={onEdit}
        header={
          <div className="flex items-center gap-1">
            <button
              aria-label={`Drag ${section.title}`}
              className="cursor-grab touch-none rounded-md p-2 text-muted-foreground hover:bg-accent"
              type="button"
              {...sortable.attributes}
              {...sortable.listeners}
            >
              <GripVertical className="size-4" />
            </button>
            <Button
              aria-label={`Edit ${section.title}`}
              onClick={onEditSection}
              size="icon-sm"
              variant="ghost"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        }
      />
    </div>
  );
}

function SortableLinkRow({ link, onEdit }: { link: ProfileLink; onEdit: () => void }) {
  const sortable = useSortable({ id: `link:${link.id}` });
  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.5 : 1,
      }}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent/50"
    >
      <button
        aria-label={`Drag ${link.label}`}
        className="cursor-grab touch-none text-muted-foreground/50 group-hover:text-muted-foreground"
        type="button"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <Thumbnail link={link} />
      <button className="min-w-0 flex-1 text-left" onClick={onEdit} type="button">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{link.label}</span>
          <Status link={link} />
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{link.url}</span>
      </button>
      <Button aria-label={`Edit ${link.label}`} onClick={onEdit} size="icon-sm" variant="ghost">
        <MoreHorizontal className="size-4" />
      </Button>
    </div>
  );
}

function Thumbnail({ link }: { link: ProfileLink }) {
  const platform = getLinkPlatform(link.platformKey) ?? detectLinkPlatform(link.url);
  return link.thumbnailAssetId ? (
    <img
      alt=""
      className="size-10 shrink-0 rounded-lg object-cover"
      src={`/assets/${link.thumbnailAssetId}`}
    />
  ) : platform ? (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-lg shadow-sm"
      style={platformColors(platform)}
    >
      <PlatformIcon className="size-4" platform={platform} />
    </span>
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
      <ExternalLink className="size-4" />
    </span>
  );
}
function Status({ link }: { link: ProfileLink }) {
  const now = Date.now();
  const ended =
    link.publicationStatus === 'scheduled' && link.endsAt && new Date(link.endsAt).getTime() <= now;
  const upcoming =
    link.publicationStatus === 'scheduled' &&
    link.startsAt &&
    new Date(link.startsAt).getTime() > now;
  const label = ended
    ? 'Ended'
    : upcoming
      ? 'Scheduled'
      : link.publicationStatus === 'live'
        ? 'Live'
        : link.publicationStatus === 'scheduled'
          ? 'Live'
          : link.publicationStatus;
  return (
    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function PublicPreview({
  links,
  collections,
}: {
  links: ProfileLink[];
  collections: LinkCollection[];
}) {
  const visible = (link: ProfileLink) => {
    if (link.publicationStatus === 'live') return true;
    if (link.publicationStatus !== 'scheduled' || !link.startsAt) return false;
    const now = Date.now();
    return (
      new Date(link.startsAt).getTime() <= now &&
      (!link.endsAt || new Date(link.endsAt).getTime() > now)
    );
  };
  return (
    <aside className="sticky top-20 hidden xl:block">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Public preview
        </p>
        <span className="size-2 rounded-full bg-emerald-500" />
      </div>
      <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border border-border/70 bg-background p-5">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-border" />
        <PreviewLinks links={links.filter((link) => !link.collectionId && visible(link))} />
        {collections
          .filter((section) => section.isActive)
          .map((section) => {
            const entries = links.filter(
              (link) => link.collectionId === section.id && visible(link),
            );
            return entries.length ? (
              <section className="mt-6" key={section.id}>
                <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {section.title}
                </h3>
                {section.description ? (
                  <p className="mb-3 px-1 text-xs leading-relaxed text-muted-foreground">
                    {section.description}
                  </p>
                ) : null}
                <PreviewLinks layout={section.layout} links={entries} />
              </section>
            ) : null;
          })}
      </div>
    </aside>
  );
}
function PreviewLinks({
  links,
  layout = 'list',
}: {
  links: ProfileLink[];
  layout?: LinkCollection['layout'];
}) {
  return (
    <div
      className={
        layout === 'grid'
          ? 'grid grid-cols-2 gap-2'
          : layout === 'compact'
            ? 'space-y-1'
            : 'space-y-2'
      }
    >
      {links.map((link) => (
        <div
          className={`flex items-center gap-3 border border-border/70 bg-card ${layout === 'compact' ? 'rounded-lg p-2' : 'rounded-xl p-2.5'} ${layout === 'grid' ? 'flex-col items-start' : ''}`}
          key={link.id}
        >
          <Thumbnail link={link} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{link.label}</span>
          <ExternalLink className="size-3.5 text-muted-foreground" />
        </div>
      ))}
    </div>
  );
}

function LinkSheet({
  assets,
  collections,
  draft,
  mutation,
  onOpenChange,
}: {
  assets: AssetRecord[];
  collections: LinkCollection[];
  draft: LinkDraft;
  mutation: ReturnType<typeof useFetcher<Result>>;
  onOpenChange: (open: boolean) => void;
}) {
  const [assetId, setAssetId] = useState('');
  const [status, setStatus] = useState('live');
  const [uploadName, setUploadName] = useState('');
  const [uploadPreview, setUploadPreview] = useState('');
  const [destination, setDestination] = useState('');
  const [platformKey, setPlatformKey] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  function clearUpload() {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadPreview('');
    setUploadName('');
    if (fileInput.current) fileInput.current.value = '';
  }

  useEffect(() => {
    setAssetId(draft?.thumbnailAssetId ?? '');
    setStatus(draft?.publicationStatus ?? 'live');
    setUploadName('');
    setUploadPreview('');
    setDestination(draft?.url ?? '');
    setPlatformKey(draft?.platformKey ?? detectLinkPlatform(draft?.url ?? '')?.id ?? '');
  }, [draft]);
  useEffect(
    () => () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    },
    [uploadPreview],
  );
  const formId = 'link-editor-sheet';
  const editing = !!draft?.id;
  const platform = getLinkPlatform(platformKey);
  const formattedUrl = platform
    ? platformUrl(platform, destination)
    : /^[a-z][a-z0-9+.-]*:/i.test(destination)
      ? destination.trim()
      : destination.trim()
        ? `https://${destination.trim().replace(/^www\./, '')}`
        : '';
  return (
    <FormSheet
      open={draft !== undefined}
      onOpenChange={onOpenChange}
      title={editing ? 'Edit link' : 'Add link'}
      description="Everything here changes how this destination appears on your public profile."
      size="wide"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={mutation.state !== 'idle'} form={formId} type="submit">
            {mutation.state === 'idle' ? 'Save link' : 'Saving…'}
          </Button>
        </>
      }
    >
      <mutation.Form className="space-y-5" encType="multipart/form-data" id={formId} method="post">
        <input name="intent" type="hidden" value="save-link" />
        <input name="linkId" type="hidden" value={draft?.id ?? ''} />
        <input name="thumbnailAssetId" type="hidden" value={assetId} />
        <input name="platformKey" type="hidden" value={platformKey} />
        <input name="connectedAccountId" type="hidden" value={draft?.connectedAccountId ?? ''} />
        <input name="url" type="hidden" value={formattedUrl} />
        {platform ? (
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
            <span
              className="grid size-10 place-items-center rounded-lg shadow-sm"
              style={platformColors(platform)}
            >
              <PlatformIcon className="size-4" platform={platform} />
            </span>
            <span>
              <span className="block text-sm font-medium">{platform.name}</span>
              <span className="block text-xs text-muted-foreground">Platform link</span>
            </span>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Label"
            name="label"
            defaultValue={draft?.label}
            placeholder="Watch my latest film"
          />
          <div className="space-y-2">
            <Label htmlFor="link-destination">
              {platform?.inputLabel ?? (platform?.baseUrl ? 'Username or URL' : 'Destination')}
            </Label>
            <Input
              id="link-destination"
              inputMode="url"
              onChange={(event) => {
                const value = event.target.value;
                setDestination(value);
                if (!draft?.platformKey) setPlatformKey(detectLinkPlatform(value)?.id ?? '');
              }}
              placeholder={platform?.placeholder ?? (platform?.baseUrl ? '@username' : 'https://…')}
              required
              value={destination}
            />
            {platform?.baseUrl && destination && !/^[a-z][a-z0-9+.-]*:/i.test(destination) ? (
              <p className="truncate text-[11px] text-muted-foreground">{formattedUrl}</p>
            ) : null}
          </div>
        </div>
        {mutation.data?.fieldErrors ? (
          <p className="text-sm text-destructive">
            {mutation.data.fieldErrors.label ?? mutation.data.fieldErrors.url}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="link-collection">Section</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={draft?.collectionId ?? ''}
              id="link-collection"
              name="collectionId"
            >
              <option value="">Featured links</option>
              {collections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-status">Visibility</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              id="link-status"
              name="publicationStatus"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="live">Live</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        </div>
        {status === 'scheduled' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Publish at"
              name="startsAt"
              defaultValue={draft?.startsAt?.slice(0, 16)}
              type="datetime-local"
            />
            <div className="space-y-2">
              <Label htmlFor="endsAt">
                Hide at <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                defaultValue={draft?.endsAt?.slice(0, 16)}
                id="endsAt"
                name="endsAt"
                type="datetime-local"
              />
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>Thumbnail</Label>
            {assetId || uploadPreview ? (
              <Button
                className="h-auto px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => {
                  clearUpload();
                  setAssetId('');
                }}
                type="button"
                variant="ghost"
              >
                Remove thumbnail
              </Button>
            ) : null}
          </div>
          <div className="grid max-h-56 grid-cols-5 gap-2 overflow-y-auto pr-1">
            <label
              className={`relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed transition-colors hover:bg-accent ${uploadPreview ? 'border-foreground ring-1 ring-foreground' : 'border-input'}`}
              title="Upload a new thumbnail"
            >
              {uploadPreview ? (
                <img
                  alt="New thumbnail preview"
                  className="size-full object-cover"
                  src={uploadPreview}
                />
              ) : (
                <ImagePlus className="size-5 text-muted-foreground" />
              )}
              <input
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                name="thumbnail"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (uploadPreview) URL.revokeObjectURL(uploadPreview);
                  setAssetId('');
                  setUploadName(file.name);
                  setUploadPreview(URL.createObjectURL(file));
                }}
                ref={fileInput}
                type="file"
              />
            </label>
            {assets
              .filter((asset) => asset.contentType.startsWith('image/'))
              .map((asset) => (
                <button
                  className={`overflow-hidden rounded-lg border ${assetId === asset.id ? 'border-foreground ring-1 ring-foreground' : 'border-border'}`}
                  key={asset.id}
                  onClick={() => {
                    clearUpload();
                    setAssetId(asset.id);
                  }}
                  type="button"
                >
                  <img
                    alt=""
                    className="aspect-square size-full object-cover"
                    src={`/assets/${asset.id}`}
                  />
                </button>
              ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Choose an asset or use the dashed tile to upload a new image.
          </p>
          {uploadName ? <p className="text-xs font-medium">Selected: {uploadName}</p> : null}
          <p className="text-[11px] text-muted-foreground">
            Uploads are saved to your Assets library.
          </p>
        </div>
        {editing ? (
          <Button
            className="text-destructive hover:text-destructive"
            name="deleteLinkId"
            type="submit"
            value={draft.id}
            variant="ghost"
          >
            Delete link
          </Button>
        ) : null}
      </mutation.Form>
    </FormSheet>
  );
}

function SectionSheet({
  draft,
  mutation,
  onOpenChange,
}: {
  draft: LinkCollection | null | undefined;
  mutation: ReturnType<typeof useFetcher<Result>>;
  onOpenChange: (open: boolean) => void;
}) {
  const formId = 'section-editor-sheet';
  return (
    <FormSheet
      open={draft !== undefined}
      onOpenChange={onOpenChange}
      title={draft ? 'Edit section' : 'New section'}
      description="Sections are visible headings that give your links context."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={mutation.state !== 'idle'} form={formId} type="submit">
            Save section
          </Button>
        </>
      }
    >
      <mutation.Form className="space-y-4" id={formId} method="post">
        <input name="intent" type="hidden" value="save-collection" />
        <input name="collectionId" type="hidden" value={draft?.id ?? ''} />
        <Field
          label="Section title"
          name="title"
          defaultValue={draft?.title}
          placeholder="Start here"
        />
        <div className="space-y-2">
          <Label htmlFor="section-description">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            defaultValue={draft?.description}
            id="section-description"
            maxLength={180}
            name="description"
            placeholder="A short cue that helps visitors understand this section."
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Presentation</legend>
          <div className="grid grid-cols-3 gap-2">
            {(['list', 'grid', 'compact'] as const).map((layout) => (
              <label className="cursor-pointer" key={layout}>
                <input
                  className="peer sr-only"
                  defaultChecked={(draft?.layout ?? 'list') === layout}
                  name="layout"
                  type="radio"
                  value={layout}
                />
                <span className="block rounded-lg border border-input px-3 py-2 text-center text-xs font-medium capitalize peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background">
                  {layout}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
          <span>
            <span className="block font-medium">Visible on profile</span>
            <span className="text-xs text-muted-foreground">
              Hide this section without deleting it.
            </span>
          </span>
          <input defaultChecked={draft ? !!draft.isActive : true} name="isActive" type="checkbox" />
        </label>
        {draft ? (
          <Button
            className="text-destructive hover:text-destructive"
            name="deleteCollectionId"
            type="submit"
            value={draft.id}
            variant="ghost"
          >
            Delete section
          </Button>
        ) : null}
      </mutation.Form>
    </FormSheet>
  );
}

function Field({
  label,
  name,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required {...props} />
    </div>
  );
}
