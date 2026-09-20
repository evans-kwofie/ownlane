import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Import, MoreHorizontal, Star } from 'lucide-react';
import { Button } from '@ownlane/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ownlane/ui/components/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ownlane/ui/components/select';
import { toast } from '@ownlane/ui/components/sonner';
import { useFetcher } from 'react-router';
import { EmptyState } from '../../empty-state';
import { PageHeader } from '../../page-header';
import type { ConnectedAccount } from '../../../features/connections/schema';
import type { ContentItem } from '../../../features/content/schema';
import { getConnectionProvider } from '../../../features/connections/providers';
import { getLinkPlatform, PlatformIcon, platformColors } from '../../../features/links/platforms';

type Result = { message?: string; error?: string };
type SourceFilter = 'all' | 'github' | 'twitch';
type StatusFilter = 'all' | 'featured' | 'not-featured';

export function ContentWorkspace({
  items,
  accounts,
}: {
  items: ContentItem[];
  accounts: ConnectedAccount[];
}) {
  const mutation = useFetcher<Result>();
  const [source, setSource] = useState<SourceFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  useEffect(() => {
    if (mutation.data?.message) toast.success(mutation.data.message);
    if (mutation.data?.error) toast.error(mutation.data.error);
  }, [mutation.data]);

  const importable = accounts.filter(
    (account) => ['github', 'twitch'].includes(account.provider) && account.status === 'connected',
  );
  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (source === 'all' || item.provider === source) &&
          (status === 'all' || (status === 'featured' ? item.isFeatured : !item.isFeatured)),
      ),
    [items, source, status],
  );

  return (
    <>
      <PageHeader
        title="Content"
        description="Bring your latest work together, then choose what appears on your public profile."
        action={
          importable.length ? (
            <div className="flex flex-wrap gap-2">
              {importable.map((account) => (
                <Button
                  disabled={mutation.state !== 'idle'}
                  key={account.id}
                  onClick={() =>
                    mutation.submit(
                      { intent: 'import-content', accountId: account.id },
                      { method: 'post' },
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  <Import className="size-4" /> Import{' '}
                  {getConnectionProvider(account.provider)?.name ?? account.provider}
                </Button>
              ))}
            </div>
          ) : undefined
        }
      />

      {items.length ? (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredItems.length} of {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                label="Source"
                onValueChange={(value) => setSource(value as SourceFilter)}
                value={source}
              >
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="github">GitHub</SelectItem>
                <SelectItem value="twitch">Twitch</SelectItem>
              </FilterSelect>
              <FilterSelect
                label="Status"
                onValueChange={(value) => setStatus(value as StatusFilter)}
                value={status}
              >
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="featured">On public profile</SelectItem>
                <SelectItem value="not-featured">Not on public profile</SelectItem>
              </FilterSelect>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-border/70 bg-muted/30 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Content</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="w-12 px-4 py-3" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.map((item) => (
                  <ContentRow item={item} key={item.id} mutation={mutation} />
                ))}
              </tbody>
            </table>
          </div>

          {!filteredItems.length ? (
            <div className="px-4 py-14 text-center">
              <p className="text-sm font-medium">No matching content</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try changing or clearing a filter.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="No content imported"
          description={
            importable.length
              ? 'Import recent work from a connected platform to start your shared content library.'
              : 'Connect GitHub or Twitch to import recent work here.'
          }
        />
      )}
    </>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger
        aria-label={`Filter by ${label.toLowerCase()}`}
        className="h-8 w-[164px] text-xs"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function ContentRow({
  item,
  mutation,
}: {
  item: ContentItem;
  mutation: ReturnType<typeof useFetcher<Result>>;
}) {
  const platform = getLinkPlatform(item.provider);
  const source = getConnectionProvider(item.provider)?.name ?? item.provider;
  const itemType = item.kind === 'repository' ? 'Repository' : item.kind;
  const togglePublicProfile = () =>
    mutation.submit({ intent: 'toggle-featured', contentId: item.id }, { method: 'post' });

  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg shadow-sm"
            style={platformColors(platform)}
          >
            <PlatformIcon className="size-4" platform={platform} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{item.title}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {item.description || itemType}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-muted-foreground">{source}</td>
      <td className="px-4 py-3.5">
        <ContentVisibilityBadge isPublic={item.isFeatured} />
      </td>
      <td className="px-4 py-3.5 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`Actions for ${item.title}`} size="icon-sm" variant="ghost">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem asChild>
              <a href={item.url} rel="noreferrer noopener" target="_blank">
                View {itemType.toLowerCase()} <ExternalLink className="ml-auto size-3.5" />
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={mutation.state !== 'idle'} onSelect={togglePublicProfile}>
              <Star className={item.isFeatured ? 'size-3.5 fill-current' : 'size-3.5'} />
              {item.isFeatured ? 'Remove from public profile' : 'Show on public profile'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function ContentVisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return isPublic ? (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold tracking-[0.02em] text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-300">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      LIVE ON PROFILE
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-600/20 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold tracking-[0.02em] text-amber-800 dark:border-amber-400/20 dark:text-amber-300">
      <span className="size-1.5 rounded-full bg-amber-500" />
      IN LIBRARY
    </span>
  );
}
