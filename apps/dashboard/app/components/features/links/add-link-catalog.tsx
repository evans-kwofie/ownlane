import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Link2, Search } from 'lucide-react';
import { FormSheet } from '@ownlane/ui/components/form-sheet';
import { Input } from '@ownlane/ui/components/input';

import {
  LINK_PLATFORMS,
  PLATFORM_CATEGORIES,
  PlatformIcon,
  getLinkPlatform,
  normalizeProvider,
  platformColors,
  platformUrl,
  type LinkPlatform,
  type PlatformCategory,
} from '../../../features/links/platforms';
import type { ConnectedAccountLinkSuggestion } from '../../../features/links/queries.server';

export type PlatformSelection = {
  platformKey?: string;
  connectedAccountId?: string;
  label: string;
  url: string;
};

export function AddLinkCatalog({
  open,
  connections,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  connections: ConnectedAccountLinkSuggestion[];
  onOpenChange: (open: boolean) => void;
  onSelect: (selection: PlatformSelection) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PlatformCategory | 'All'>('All');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCategory('All');
  }, [open]);

  const connected = connections
    .map((account) => ({ account, platform: getLinkPlatform(normalizeProvider(account.provider)) }))
    .filter((entry): entry is typeof entry & { platform: LinkPlatform } => !!entry.platform);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return LINK_PLATFORMS.filter((platform) => category === 'All' || platform.category === category)
      .filter(
        (platform) =>
          !needle ||
          [platform.name, platform.category, platform.id, ...(platform.aliases ?? [])].some(
            (value) => value.toLowerCase().includes(needle),
          ),
      )
      .sort((a, b) => Number(b.popular) - Number(a.popular) || a.name.localeCompare(b.name));
  }, [category, query]);

  function selectPlatform(platform: LinkPlatform, account?: ConnectedAccountLinkSuggestion) {
    onSelect({
      platformKey: platform.id,
      connectedAccountId: account?.id,
      label: platform.name,
      url: account?.handle ? platformUrl(platform, account.handle) : '',
    });
    onOpenChange(false);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add a link"
      description="Start with a platform for the right logo and URL format, or create a custom destination."
      size="extra-wide"
    >
      <div className="space-y-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search link platforms"
            autoFocus
            className="pl-9"
            onChange={(event) => {
              setQuery(event.target.value);
              setCategory('All');
            }}
            placeholder="Search Instagram, newsletter, booking…"
            value={query}
          />
        </div>
        {!query && connected.length ? (
          <section>
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  From your connections
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Creates a public link without changing the connection.
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground">Ready to add</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {connected.map(({ account, platform }) => (
                <button
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/30"
                  key={account.id}
                  onClick={() => selectPlatform(platform, account)}
                  type="button"
                >
                  <PlatformTile platform={platform} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{platform.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {account.handle
                        ? /^[a-z][a-z0-9+.-]*:/i.test(account.handle)
                          ? account.handle
                          : `@${account.handle.replace(/^@/, '')}`
                        : 'Connected account'}
                    </span>
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </section>
        ) : null}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <CategoryChip active={category === 'All'} onClick={() => setCategory('All')}>
            All
          </CategoryChip>
          {PLATFORM_CATEGORIES.map((item) => (
            <CategoryChip active={category === item} key={item} onClick={() => setCategory(item)}>
              {item}
            </CategoryChip>
          ))}
        </div>
        <div className="grid max-h-[440px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
          <button
            className="group flex min-h-24 flex-col items-start justify-between rounded-xl border border-dashed border-border p-3 text-left transition-colors hover:border-foreground/40 hover:bg-accent/40"
            onClick={() => {
              onSelect({ label: query.trim(), url: '' });
              onOpenChange(false);
            }}
            type="button"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-foreground text-background">
              <Link2 className="size-4" />
            </span>
            <span>
              <span className="block max-w-32 truncate text-sm font-medium">
                {query.trim() ? `Add “${query.trim()}”` : 'Custom link'}
              </span>
              <span className="text-[11px] text-muted-foreground">Any destination</span>
            </span>
          </button>
          {shown.map((platform) => (
            <button
              className="group flex min-h-24 flex-col items-start justify-between rounded-xl border border-border/70 bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/30"
              key={platform.id}
              onClick={() => selectPlatform(platform)}
              type="button"
            >
              <PlatformTile platform={platform} />
              <span>
                <span className="block text-sm font-medium">{platform.name}</span>
                <span className="text-[11px] text-muted-foreground">{platform.category}</span>
              </span>
            </button>
          ))}
        </div>
        {!shown.length ? (
          <p className="text-center text-xs text-muted-foreground">
            No matching platform. Use the custom link option above for any destination.
          </p>
        ) : null}
      </div>
    </FormSheet>
  );
}

function PlatformTile({ platform }: { platform: LinkPlatform }) {
  return (
    <span
      className="grid size-9 place-items-center rounded-lg shadow-sm"
      style={platformColors(platform)}
    >
      <PlatformIcon className="size-4" platform={platform} />
    </span>
  );
}
function CategoryChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
