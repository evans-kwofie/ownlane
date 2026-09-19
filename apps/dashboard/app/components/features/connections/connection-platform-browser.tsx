import { useMemo, useState } from 'react';
import { ArrowLeft, Check, LockKeyhole, Search } from 'lucide-react';
import { Badge } from '@ownlane/ui/components/badge';
import { Button } from '@ownlane/ui/components/button';
import { Input } from '@ownlane/ui/components/input';
import { Link } from 'react-router';

import { PageHeader } from '../../page-header';
import {
  CONNECTION_PROVIDERS,
  CONNECTION_PROVIDER_CATEGORIES,
  type ConnectionProviderCategory,
} from '../../../features/connections/providers';
import { PlatformIcon, getLinkPlatform, platformColors } from '../../../features/links/platforms';
import { useWorkspacePath } from '../../../lib/workspaces';

export function ConnectionPlatformBrowser({ enabledProviders }: { enabledProviders: string[] }) {
  const workspacePath = useWorkspacePath();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ConnectionProviderCategory | 'All'>('All');
  const enabled = useMemo(() => new Set(enabledProviders), [enabledProviders]);
  const providers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return CONNECTION_PROVIDERS.filter(
      (provider) => category === 'All' || provider.category === category,
    )
      .filter(
        (provider) =>
          !needle ||
          [provider.name, provider.category, provider.description].some((value) =>
            value.toLowerCase().includes(needle),
          ),
      )
      .sort(
        (a, b) =>
          Number(enabled.has(b.id)) - Number(enabled.has(a.id)) ||
          Number(b.popular) - Number(a.popular) ||
          a.name.localeCompare(b.name),
      );
  }, [category, enabled, query]);

  return (
    <>
      <PageHeader
        action={
          <Button asChild variant="outline">
            <Link to={workspacePath('/connections')}>
              <ArrowLeft className="size-4" /> Connections
            </Link>
          </Button>
        }
        description="Choose a provider to authorize for private identity operations and synchronization."
        title="Browse platforms"
      />

      <div className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">
          Connections and public links are separate.
        </span>{' '}
        Authorizing a provider does not display it on your public profile. You choose that
        separately in Links.
      </div>

      <div className="sticky top-16 z-10 mt-5 space-y-3 border-b border-border/70 bg-background/95 pb-4 backdrop-blur">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search connection providers"
            autoFocus
            className="pl-9"
            onChange={(event) => {
              setQuery(event.target.value);
              setCategory('All');
            }}
            placeholder="Search Instagram, YouTube, Shopify…"
            value={query}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <CategoryChip active={category === 'All'} onClick={() => setCategory('All')}>
            All
          </CategoryChip>
          {CONNECTION_PROVIDER_CATEGORIES.map((item) => (
            <CategoryChip active={category === item} key={item} onClick={() => setCategory(item)}>
              {item}
            </CategoryChip>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {providers.map((provider) => {
          const platform = getLinkPlatform(provider.iconKey);
          const available = enabled.has(provider.id);
          return (
            <article
              className="flex min-h-48 flex-col rounded-xl border border-border/70 bg-card p-5"
              key={provider.id}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-lg"
                  style={platformColors(platform)}
                >
                  <PlatformIcon className="size-5" platform={platform} />
                </span>
                <Badge variant="outline">
                  {available ? (
                    <>
                      <Check className="size-3" /> Available
                    </>
                  ) : (
                    <>
                      <LockKeyhole className="size-3" /> Planned
                    </>
                  )}
                </Badge>
              </div>
              <div className="mt-5 flex-1">
                <h2 className="text-sm font-semibold">{provider.name}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {provider.description}
                </p>
              </div>
              <div className="mt-5 border-t border-border/70 pt-3">
                {available ? (
                  <Button className="w-full" disabled>
                    Connect
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    OAuth adapter and provider approval required.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!providers.length ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm font-medium">No matching platform</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try another name or browse all categories.
          </p>
        </div>
      ) : null}

      {!enabledProviders.length ? (
        <p className="mt-6 border-t border-border/70 pt-5 text-xs leading-relaxed text-muted-foreground">
          Provider authorization has not been configured for this deployment yet. Integrations
          remain marked as planned instead of creating simulated connections.
        </p>
      ) : null}
    </>
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
      className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-muted-foreground hover:text-foreground'}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
