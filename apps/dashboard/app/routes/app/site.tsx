import { useState, type DragEvent } from 'react';
import { cn } from '@ownlane/ui/lib/utils';

import { PageHeader } from '../../components/page-header';
import { useActiveWorkspace } from '../../lib/workspaces';
import type { Route } from './+types/site';

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Profile configuration — Ownlane' }];
}

type Section = { id: string; name: string; enabled: boolean; count: string };
type Layout = 'open' | 'dossier' | 'card';

const DEFAULT_SECTIONS: Section[] = [
  { id: 'about', name: 'About', enabled: true, count: '1 field' },
  { id: 'categories', name: 'Categories', enabled: true, count: '4' },
  { id: 'skills', name: 'Skills', enabled: true, count: '2' },
  { id: 'links', name: 'Links', enabled: false, count: 'empty' },
  { id: 'services', name: 'What I do', enabled: false, count: 'empty' },
  { id: 'proof', name: 'Proof', enabled: false, count: 'empty' },
  { id: 'particulars', name: 'Particulars', enabled: true, count: '6' },
  { id: 'contact', name: 'Get in touch', enabled: true, count: '5' },
];

const ACCENTS = [
  { name: 'Ownlane orange', value: '#ff4d00' },
  { name: 'Black', value: '#0a0a0a' },
  { name: 'Blue', value: '#1f6feb' },
  { name: 'Green', value: '#15925c' },
  { name: 'Violet', value: '#8b5cf6' },
];

export default function PublicSite() {
  const { workspace } = useActiveWorkspace();
  const [slug, setSlug] = useState(workspace?.slug ?? 'your-name');
  const [published, setPublished] = useState(true);
  const [indexable, setIndexable] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [layout, setLayout] = useState<Layout>('open');
  const [accent, setAccent] = useState('#ff4d00');
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);

  const profileName = workspace?.name || 'Your name';
  const address = `useownlane.com/${slug || '…'}`;

  function toggleSection(id: string) {
    setSections((current) =>
      current.map((section) =>
        section.id === id ? { ...section, enabled: !section.enabled } : section,
      ),
    );
  }

  function moveSection(id: string, direction: -1 | 1) {
    setSections((current) => {
      const index = current.findIndex((section) => section.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  }

  function reorderSection(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    setSections((current) => {
      const sourceIndex = current.findIndex((section) => section.id === sourceId);
      const targetIndex = current.findIndex((section) => section.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;

      const reordered = [...current];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });
  }

  function startDragging(event: DragEvent<HTMLSpanElement>, id: string) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDraggedSectionId(id);
  }

  function dropOnSection(event: DragEvent<HTMLLIElement>, targetId: string) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain');
    if (sourceId) reorderSection(sourceId, targetId);
    setDraggedSectionId(null);
  }

  return (
    <>
      <PageHeader
        action={<StatusPill published={published} />}
        title="Configuration"
        description="What visitors see at your address. Your profile holds what is true; this decides how it is published."
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5 pb-8 lg:pr-8">
          <ControlCard hint="Old addresses redirect for 12 months" title="Address">
            <label className="flex items-center gap-0.5 rounded-lg border border-transparent bg-muted px-3 py-2.5 focus-within:border-primary focus-within:bg-card">
              <span className="shrink-0 font-mono text-[12.5px] text-muted-foreground">
                useownlane.com/
              </span>
              <input
                aria-label="Public site address"
                className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] outline-none"
                onChange={(event) =>
                  setSlug(
                    event.target.value
                      .trim()
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '-'),
                  )
                }
                spellCheck={false}
                value={slug}
              />
            </label>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px]">Custom domain</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Serve this page from a domain you own
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground">
                Pro, later
              </span>
            </div>
          </ControlCard>

          <ControlCard hint="Moved here from the profile" title="Publishing">
            <div className="divide-y divide-border/60">
              <ToggleRow
                checked={published}
                description={
                  published
                    ? 'Anyone with the address can read it'
                    : 'Only you can see it from the dashboard'
                }
                label="Published"
                onChange={setPublished}
              />
              <ToggleRow
                checked={indexable}
                description="Appear in Google and Bing results"
                label="Allow search engines"
                onChange={setIndexable}
              />
              <ToggleRow
                checked={showBadge}
                description="The badge in the footer"
                label={'Show “Made with Ownlane”'}
                onChange={setShowBadge}
              />
            </div>
          </ControlCard>

          <ControlCard hint="Move or switch off to hide" title="Sections">
            <ul className="-mx-4 -mb-4 divide-y divide-border/60">
              {sections.map((section, index) => (
                <li
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 transition-opacity',
                    draggedSectionId === section.id && 'opacity-35',
                  )}
                  key={section.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => dropOnSection(event, section.id)}
                >
                  <span
                    aria-label={`Drag ${section.name} to reorder`}
                    className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                    draggable
                    onDragEnd={() => setDraggedSectionId(null)}
                    onDragStart={(event) => startDragging(event, section.id)}
                    role="button"
                  >
                    ⠿
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 text-[13px]',
                      !section.enabled && 'text-muted-foreground',
                    )}
                  >
                    {section.name}
                  </span>
                  <span className="font-mono text-[10.5px] text-muted-foreground">
                    {section.count}
                  </span>
                  <button
                    aria-label={`Move ${section.name} up`}
                    className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => moveSection(section.id, -1)}
                    type="button"
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Move ${section.name} down`}
                    className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={index === sections.length - 1}
                    onClick={() => moveSection(section.id, 1)}
                    type="button"
                  >
                    ↓
                  </button>
                  <Switch
                    checked={section.enabled}
                    label={`Show ${section.name}`}
                    onChange={() => toggleSection(section.id)}
                  />
                </li>
              ))}
            </ul>
          </ControlCard>

          <ControlCard hint="Applies to this identity only" title="Appearance">
            <p className="mb-2 text-[13px]">Layout</p>
            <div className="grid grid-cols-3 gap-2">
              {(['open', 'dossier', 'card'] as Layout[]).map((option) => (
                <button
                  aria-pressed={layout === option}
                  className={cn(
                    'rounded-lg border p-2 text-left transition-colors',
                    layout === option
                      ? 'border-foreground shadow-[inset_0_0_0_1px_currentColor]'
                      : 'border-border hover:bg-muted',
                  )}
                  key={option}
                  onClick={() => setLayout(option)}
                  type="button"
                >
                  <LayoutThumbnail layout={option} />
                  <span className="mt-1.5 block text-[11.5px]">
                    {option === 'open' ? 'Open page' : option === 'dossier' ? 'Dossier' : 'Card'}
                  </span>
                </button>
              ))}
            </div>
            <p className="mb-2 mt-5 text-[13px]">Accent</p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((option) => (
                <button
                  aria-label={option.name}
                  aria-pressed={accent === option.value}
                  className={cn(
                    'size-7 rounded-full border-2 border-transparent transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    accent === option.value && 'scale-110 border-foreground',
                  )}
                  key={option.value}
                  onClick={() => setAccent(option.value)}
                  style={{ backgroundColor: option.value }}
                  type="button"
                />
              ))}
            </div>
          </ControlCard>
        </div>

        <aside className="border-t border-border bg-muted p-[18px] lg:sticky lg:top-20 lg:self-start lg:border-t-0 lg:border-l">
          <div className="mb-2 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.05em] text-muted-foreground">
            <span>Live preview</span>
            <span>
              {published
                ? indexable
                  ? 'Published · indexed'
                  : 'Published · hidden'
                : 'Not published'}
            </span>
          </div>
          <Preview
            accent={accent}
            address={address}
            layout={layout}
            name={profileName}
            published={published}
            sections={sections}
            showBadge={showBadge}
          />
        </aside>
      </div>
    </>
  );
}

function ControlCard({
  children,
  hint,
  title,
}: {
  children: React.ReactNode;
  hint: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border">
      <header className="flex items-baseline justify-between gap-3 px-4 pt-3">
        <h3 className="text-[13.5px] font-medium">{title}</h3>
        <span className="text-right text-[11.5px] text-muted-foreground">{hint}</span>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
function StatusPill({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium',
        published ? 'bg-[#15925c]/10 text-[#15925c]' : 'bg-muted text-muted-foreground',
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {published ? 'Live' : 'Not published'}
    </span>
  );
}
function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn(
        'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-[18px] after:rounded-full after:bg-white after:shadow-sm after:transition-transform',
        checked ? 'bg-[#15925c] after:translate-x-4' : 'bg-foreground/15',
      )}
      onClick={onChange}
      role="switch"
      type="button"
    />
  );
}
function ToggleRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-[13px]">{label}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} label={label} onChange={() => onChange(!checked)} />
    </div>
  );
}
function LayoutThumbnail({ layout }: { layout: Layout }) {
  return (
    <span
      className={cn(
        'flex h-10 gap-1 rounded-lg bg-muted p-1.5',
        layout === 'open' && 'flex-col',
        layout === 'card' && 'items-center justify-center',
      )}
    >
      <i
        className={cn(
          'block rounded-lg bg-foreground/15',
          layout === 'open' ? 'h-1.5 w-3/5' : layout === 'dossier' ? 'w-1/3' : 'h-5 w-4/5',
        )}
      />
      <i
        className={cn(
          'block rounded-lg bg-foreground/15',
          layout === 'open' ? 'h-1 w-full' : layout === 'dossier' ? 'flex-1' : 'hidden',
        )}
      />
      <i
        className={cn(
          'block rounded-lg bg-foreground/15',
          layout === 'open' ? 'h-1 w-4/5' : 'hidden',
        )}
      />
    </span>
  );
}
function Preview({
  accent,
  address,
  layout,
  name,
  published,
  sections,
  showBadge,
}: {
  accent: string;
  address: string;
  layout: Layout;
  name: string;
  published: boolean;
  sections: Section[];
  showBadge: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted px-2.5 py-2">
        <i className="size-1.5 rounded-full bg-foreground/15" />
        <i className="size-1.5 rounded-full bg-foreground/15" />
        <i className="size-1.5 rounded-full bg-foreground/15" />
        <span className="ml-1 min-w-0 flex-1 truncate rounded-lg bg-card px-2 py-0.5 font-mono text-[9.5px] text-muted-foreground">
          {address}
        </span>
      </div>
      {published ? (
        <div
          className={cn(
            'p-4',
            layout === 'dossier' && 'grid grid-cols-[74px_minmax(0,1fr)] gap-3',
            layout === 'card' && 'm-4 border border-border text-center',
          )}
        >
          <PreviewHead accent={accent} dossier={layout === 'dossier'} name={name} />
          <div className={cn(layout === 'dossier' && 'min-w-0', layout === 'card' && 'p-4')}>
            {sections
              .filter((section) => section.enabled)
              .map((section) => (
                <PreviewSection key={section.id} section={section} />
              ))}
            {showBadge ? (
              <p className="mt-4 border-t border-border/60 pt-2 text-[8.5px] text-muted-foreground">
                Made with Ownlane
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex min-h-48 flex-col items-center justify-center gap-1 p-4 text-center text-[11px] text-muted-foreground">
          <strong className="text-[12px] font-medium text-foreground">Not published</strong>This
          address returns nothing until you publish.
        </div>
      )}
    </div>
  );
}
function PreviewHead({
  accent,
  dossier,
  name,
}: {
  accent: string;
  dossier: boolean;
  name: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5',
        dossier && 'flex-col items-start rounded-lg bg-muted p-2',
      )}
    >
      <span className="size-[34px] shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      <span>
        <span className="block text-[14px] font-medium tracking-[-0.02em]">{name}</span>
        <span className="block text-[10.5px] text-muted-foreground">
          Design engineer and founder
        </span>
      </span>
    </div>
  );
}
function PreviewSection({ section }: { section: Section }) {
  return (
    <div className="mt-3">
      <h4 className="mb-1 text-[8px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {section.name}
      </h4>
      {section.id === 'categories' || section.id === 'skills' ? (
        <div className="flex flex-wrap gap-1">
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">Design</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">Software</span>
        </div>
      ) : section.id === 'contact' ? (
        <div className="flex gap-1">
          <span className="rounded-lg bg-primary px-2 py-1 text-[9px] text-primary-foreground">
            Phone
          </span>
          <span className="rounded-lg bg-muted px-2 py-1 text-[9px]">Email</span>
        </div>
      ) : (
        <div className="space-y-1">
          <i className="block h-1.5 w-full rounded-lg bg-foreground/10" />
          <i className="block h-1.5 w-4/5 rounded-lg bg-foreground/10" />
        </div>
      )}
    </div>
  );
}
