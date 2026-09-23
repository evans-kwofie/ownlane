import { useEffect, useRef, useState } from 'react';
import { DownloadIcon, SearchIcon, Settings2Icon, WebhookIcon } from 'lucide-react';
import { Link, useFetcher, useSearchParams } from 'react-router';

import { Button } from '@ownlane/ui/components/button';
import { Input } from '@ownlane/ui/components/input';
import { cn } from '@ownlane/ui/lib/utils';

import { ContactFormSettingsSheet } from './contact-form-settings';
import { LeadDetail } from './lead-detail';
import { LeadStatusBadge } from './lead-status-badge';
import { EmptyState } from '../../empty-state';
import { PageHeader } from '../../page-header';
import { useActionFeedback } from '../../../lib/action-feedback';
import { useWorkspacePath } from '../../../lib/workspaces';
import {
  LEAD_STATUS_LABELS,
  type AudienceOverview,
  type ContactFormSettings,
  type Lead,
  type LeadStatus,
  type LeadSummary,
} from '../../../features/audience/schema';
import type { AudienceFilter } from '../../../features/audience/queries.server';

const TABS: Array<{ key: LeadStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'replied', label: 'Replied' },
  { key: 'won', label: 'Won' },
  { key: 'archived', label: 'Archived' },
  { key: 'spam', label: 'Spam' },
];

export function AudienceWorkspace({
  filter,
  overview,
  lead,
  settings,
  turnstileConfigured,
  vapidPublicKey,
  openedLeadId,
}: {
  filter: AudienceFilter;
  overview: AudienceOverview;
  lead: Lead | null;
  settings: ContactFormSettings;
  turnstileConfigured: boolean;
  vapidPublicKey?: string;
  openedLeadId: string | null;
}) {
  const [params, setParams] = useSearchParams();
  const workspacePath = useWorkspacePath();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const read = useFetcher();

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  // A selection that survives a filter change would act on rows nobody can see.
  useEffect(() => setSelected({}), [filter.status, filter.query, filter.tag, filter.cursor]);

  useEffect(() => {
    if (lead && openedLeadId === lead.id && lead.isUnread) {
      read.submit({ intent: 'mark-read', leadId: lead.id }, { method: 'post' });
    }
  }, [lead?.id, lead?.isUnread, openedLeadId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      if (!['j', 'k', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const current = overview.leads.findIndex((row) => row.id === lead?.id);
      const direction = event.key === 'j' || event.key === 'ArrowDown' ? 1 : -1;
      const index = Math.max(
        0,
        Math.min(overview.leads.length - 1, (current < 0 ? 0 : current) + direction),
      );
      const next = overview.leads[index];
      if (next) {
        event.preventDefault();
        setParam('lead', next.id);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lead?.id, overview.leads, params]);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'lead') next.delete('lead');
    if (!['cursor', 'lead'].includes(key)) next.delete('cursor');
    setParams(next, { preventScrollReset: true });
  }

  return (
    <>
      <PageHeader
        title="Audience"
        description="People who reached out, and where they came from."
        action={
          <>
            {overview.counts.all || overview.counts.spam ? (
              <Button asChild variant="outline">
                <a href={`${workspacePath('/audience')}/export.csv`}>
                  <DownloadIcon />
                  Export CSV
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to={workspacePath('/developer/webhooks')}>
                <WebhookIcon />
                Webhooks
              </Link>
            </Button>
            <Button onClick={() => setSettingsOpen(true)} variant="outline">
              <Settings2Icon />
              Form settings
            </Button>
          </>
        }
      />

      {!overview.formEnabled && !overview.counts.all ? (
        <EmptyState
          title="The contact form is off"
          description="Turn it on and a message box appears under “Get in touch” on your public profile. Everything sent lands here."
          action={<Button onClick={() => setSettingsOpen(true)}>Set up the form</Button>}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox defaultValue={filter.query} onSearch={(q) => setParam('q', q || null)} />
            <div className="flex flex-wrap gap-0.5 rounded-lg bg-muted p-0.5">
              {TABS.map((tab) => (
                <button
                  aria-pressed={filter.status === tab.key}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground',
                    filter.status === tab.key &&
                      'bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
                  )}
                  key={tab.key}
                  onClick={() => setParam('status', tab.key === 'all' ? null : tab.key)}
                  type="button"
                >
                  {tab.label}
                  <span className="text-[11px] tabular-nums opacity-70">
                    {overview.counts[tab.key]}
                  </span>
                </button>
              ))}
            </div>
            {filter.tag ? (
              <Button onClick={() => setParam('tag', null)} size="sm" variant="outline">
                Tagged “{filter.tag}” ×
              </Button>
            ) : null}
          </div>

          {selectedIds.length ? <BulkBar ids={selectedIds} onDone={() => setSelected({})} /> : null}

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.78fr)]">
            {overview.leads.length ? (
              <div className="self-start overflow-hidden rounded-xl border border-border/70 bg-card">
                <label className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
                  <input
                    aria-label="Select all leads in this view"
                    checked={
                      overview.leads.length > 0 && overview.leads.every((row) => selected[row.id])
                    }
                    className="size-4 accent-primary"
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? Object.fromEntries(overview.leads.map((row) => [row.id, true]))
                          : {},
                      )
                    }
                    type="checkbox"
                  />
                  Select all in this view
                </label>
                <ul className="divide-y divide-border">
                  {overview.leads.map((row) => (
                    <LeadRow
                      checked={Boolean(selected[row.id])}
                      isOpen={lead?.id === row.id}
                      key={row.id}
                      lead={row}
                      onOpen={() => setParam('lead', row.id)}
                      onToggle={(next) => setSelected((prev) => ({ ...prev, [row.id]: next }))}
                    />
                  ))}
                </ul>
                {overview.nextCursor ? (
                  <button
                    className="w-full border-t border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    onClick={() => setParam('cursor', overview.nextCursor)}
                    type="button"
                  >
                    Load older leads
                  </button>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title={filter.query ? 'Nothing matches that' : 'Nothing here yet'}
                description={
                  filter.query
                    ? `No lead matches “${filter.query}”.`
                    : 'No leads with this status yet.'
                }
              />
            )}
            <LeadDetail lead={lead} />
          </div>
        </>
      )}

      <ContactFormSettingsSheet
        onOpenChange={setSettingsOpen}
        open={settingsOpen}
        settings={settings}
        turnstileConfigured={turnstileConfigured}
        vapidPublicKey={vapidPublicKey}
      />
    </>
  );
}

function LeadRow({
  checked,
  isOpen,
  lead,
  onOpen,
  onToggle,
}: {
  checked: boolean;
  isOpen: boolean;
  lead: LeadSummary;
  onOpen: () => void;
  onToggle: (next: boolean) => void;
}) {
  return (
    <li
      className={cn('flex items-start gap-3 px-4 py-3 hover:bg-muted/60', isOpen && 'bg-muted/60')}
    >
      <input
        aria-label={`Select the lead from ${lead.name}`}
        checked={checked}
        className="mt-1 size-4 accent-primary"
        onChange={(event) => onToggle(event.target.checked)}
        type="checkbox"
      />
      <button className="min-w-0 flex-1 text-left" onClick={onOpen} type="button">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {lead.isUnread ? (
            <i
              aria-label="Unread"
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: 'var(--chart-2)' }}
            />
          ) : null}
          <span className={cn('truncate', lead.isUnread && 'font-semibold')}>{lead.name}</span>
          <span className="truncate text-[13px] text-muted-foreground">{lead.email}</span>
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
          {lead.message}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <LeadStatusBadge status={lead.status} />
          {lead.utmCampaign ? <Tag>{lead.utmCampaign}</Tag> : null}
          {lead.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </span>
      </button>
      <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
        {relativeTime(lead.createdAt)}
      </span>
    </li>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border px-2 py-px text-[11.5px] text-muted-foreground">
      {children}
    </span>
  );
}

function BulkBar({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const fetcher = useFetcher();
  const [tag, setTag] = useState('');

  useActionFeedback(fetcher.data, { onSuccess: onDone });

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
      style={{
        background:
          'color-mix(in srgb, var(--chart-1) calc(var(--chart-wash) * 100%), var(--card))',
        borderColor: 'color-mix(in srgb, var(--chart-1) 32%, transparent)',
      }}
    >
      <strong className="font-semibold">
        {ids.length} {ids.length === 1 ? 'lead' : 'leads'} selected
      </strong>
      <span className="flex-1" />
      <fetcher.Form className="flex flex-wrap items-center gap-2" method="post">
        {ids.map((id) => (
          <input key={id} name="leadId" type="hidden" value={id} />
        ))}
        <Button name="intent" size="sm" type="submit" value="set-status" variant="outline">
          <input name="status" type="hidden" value="replied" />
          Mark replied
        </Button>
      </fetcher.Form>
      {(['archived', 'spam'] as const).map((status) => (
        <fetcher.Form key={status} method="post">
          {ids.map((id) => (
            <input key={id} name="leadId" type="hidden" value={id} />
          ))}
          <input name="intent" type="hidden" value="set-status" />
          <Button name="status" size="sm" type="submit" value={status} variant="outline">
            {LEAD_STATUS_LABELS[status] === 'Archived' ? 'Archive' : 'Mark spam'}
          </Button>
        </fetcher.Form>
      ))}
      <fetcher.Form className="flex items-center gap-1.5" method="post">
        {ids.map((id) => (
          <input key={id} name="leadId" type="hidden" value={id} />
        ))}
        <input name="intent" type="hidden" value="add-tag" />
        <Input
          aria-label="Tag the selected leads"
          className="h-8 w-28 text-[12.5px]"
          name="tag"
          onChange={(event) => setTag(event.target.value)}
          placeholder="Tag"
          value={tag}
        />
        <Button disabled={!tag.trim()} size="sm" type="submit" variant="outline">
          Apply
        </Button>
      </fetcher.Form>
    </div>
  );
}

/** Searching on every keystroke would refetch the list constantly; this waits for a pause. */
function SearchBox({
  defaultValue,
  onSearch,
}: {
  defaultValue: string;
  onSearch: (query: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setValue(defaultValue), [defaultValue]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className="relative min-w-[180px] flex-1">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label="Search leads"
        className="pl-8"
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => onSearch(next.trim()), 300);
        }}
        placeholder="Search name, email or message"
        type="search"
        value={value}
      />
    </div>
  );
}

function relativeTime(value: string) {
  const normalised = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const then = new Date(normalised).getTime();
  if (Number.isNaN(then)) return value;

  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))}d ago`;
  return new Date(normalised).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
