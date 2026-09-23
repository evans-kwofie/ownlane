import { useState } from 'react';
import { Trash2Icon, XIcon } from 'lucide-react';
import { useFetcher } from 'react-router';

import { Button } from '@ownlane/ui/components/button';
import { Input } from '@ownlane/ui/components/input';

import { LeadStatusBadge } from './lead-status-badge';
import { useActionFeedback } from '../../../lib/action-feedback';
import { NOTE_MAX, TAG_MAX, type Lead } from '../../../features/audience/schema';

/**
 * One lead, beside the list rather than over it. Triage is read, act, move to
 * the next — keeping both in view means the list never has to be dismissed to
 * get back to it, and the next lead is one click away.
 */
export function LeadDetail({ lead }: { lead: Lead | null }) {
  const status = useFetcher();
  const notes = useFetcher();
  const tags = useFetcher();
  const erase = useFetcher();
  const [tag, setTag] = useState('');

  useActionFeedback(status.data);
  useActionFeedback(notes.data);
  useActionFeedback(tags.data, { onSuccess: () => setTag('') });

  if (!lead) {
    return (
      <aside className="self-start rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center xl:sticky xl:top-4">
        <p className="text-[13.5px] text-muted-foreground">Select a lead to read it.</p>
      </aside>
    );
  }

  const attribution: Array<[string, string, boolean?]> = [
    ['Source', lead.utmSource || 'Direct'],
    ['Medium', lead.utmMedium || '—'],
    ['Campaign', lead.utmCampaign || '—', true],
    ['Referrer', lead.referrerHost || 'None', true],
    ['Country', lead.countryCode ? countryName(lead.countryCode) : 'Unknown'],
    ['Device', lead.deviceType[0].toUpperCase() + lead.deviceType.slice(1)],
  ];

  return (
    <aside className="self-start rounded-xl border border-border/70 bg-card p-5 xl:sticky xl:top-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{lead.name}</h2>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            <a className="underline underline-offset-2" href={`mailto:${lead.email}`}>
              {lead.email}
            </a>
            {lead.phone ? ` · ${lead.phone}` : null}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {formatDateTime(lead.createdAt)}
          </p>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a href={`mailto:${lead.email}?subject=${encodeURIComponent(replySubject(lead))}`}>
            Reply by email
          </a>
        </Button>
        {(
          [
            ['replied', 'Mark replied'],
            ['archived', 'Archive'],
          ] as const
        ).map(([value, label]) => (
          <status.Form key={value} method="post">
            <input name="leadId" type="hidden" value={lead.id} />
            <input name="intent" type="hidden" value="set-status" />
            <Button
              disabled={status.state !== 'idle'}
              name="status"
              size="sm"
              type="submit"
              value={value}
              variant="outline"
            >
              {label}
            </Button>
          </status.Form>
        ))}
        <status.Form method="post">
          <input name="leadId" type="hidden" value={lead.id} />
          <input name="intent" type="hidden" value="set-status" />
          <Button
            disabled={status.state !== 'idle'}
            name="status"
            size="sm"
            type="submit"
            value={lead.status === 'spam' ? 'new' : 'spam'}
            variant="outline"
          >
            {lead.status === 'spam' ? 'Not spam' : 'Spam'}
          </Button>
        </status.Form>
      </div>

      <SectionLabel className="mt-5">{lead.subject || 'Message'}</SectionLabel>
      <div className="mt-2 whitespace-pre-wrap rounded-lg bg-muted px-3.5 py-3 text-sm leading-relaxed">
        {lead.message}
      </div>

      <SectionLabel className="mt-5">Where this came from</SectionLabel>
      <dl className="mt-1">
        {attribution.map(([label, value, mono]) => (
          <div
            className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 text-[13px] last:border-b-0"
            key={label}
          >
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className={`min-w-0 truncate text-right ${mono ? 'font-mono text-xs' : ''}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <SectionLabel className="mt-5">Tags</SectionLabel>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {lead.tags.map((name) => (
          <tags.Form className="contents" key={name} method="post">
            <input name="leadId" type="hidden" value={lead.id} />
            <input name="tag" type="hidden" value={name} />
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11.5px] text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              name="intent"
              type="submit"
              value="remove-tag"
            >
              {name}
              <XIcon aria-label={`Remove tag ${name}`} className="size-3" />
            </button>
          </tags.Form>
        ))}
        <tags.Form className="flex items-center gap-1.5" method="post">
          <input name="leadId" type="hidden" value={lead.id} />
          <input name="intent" type="hidden" value="add-tag" />
          <Input
            aria-label="Add a tag"
            className="h-7 w-24 text-[12.5px]"
            maxLength={TAG_MAX}
            name="tag"
            onChange={(event) => setTag(event.target.value)}
            placeholder="Add tag"
            value={tag}
          />
          <Button disabled={!tag.trim()} size="sm" type="submit" variant="outline">
            Add
          </Button>
        </tags.Form>
      </div>

      {/* The sentence someone agreed to, not a boolean that proves nothing. */}
      <div className="mt-4 flex gap-2.5 rounded-lg border border-border px-3.5 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
        <span
          aria-hidden="true"
          className="mt-0.5 size-3.5 shrink-0 rounded-full"
          style={{ background: 'var(--chart-up)' }}
        />
        <span>
          <strong className="font-medium text-foreground">
            Consented {formatDateTime(lead.consentedAt)}
          </strong>
          <br />“{lead.consentText}”
        </span>
      </div>

      <SectionLabel className="mt-5">Notes</SectionLabel>
      <p className="mt-1 text-xs text-muted-foreground">
        Only your team sees these. They are never shown to the sender.
      </p>
      {lead.notes.length ? (
        <ul className="mt-3 space-y-3">
          {lead.notes.map((note) => (
            <li className="group flex items-start justify-between gap-2" key={note.id}>
              <div className="min-w-0">
                <p className="text-[11.5px] text-muted-foreground">
                  {formatDateTime(note.createdAt)}
                </p>
                <p className="text-[13.5px]">{note.body}</p>
              </div>
              <notes.Form method="post">
                <input name="noteId" type="hidden" value={note.id} />
                <Button
                  aria-label="Delete note"
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  name="intent"
                  size="icon-sm"
                  type="submit"
                  value="delete-note"
                  variant="ghost"
                >
                  <Trash2Icon />
                </Button>
              </notes.Form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-muted-foreground">No notes yet.</p>
      )}
      <notes.Form
        className="mt-3 flex gap-2"
        method="post"
        onSubmit={(event) => event.currentTarget.reset()}
      >
        <input name="leadId" type="hidden" value={lead.id} />
        <input name="intent" type="hidden" value="add-note" />
        <Input aria-label="Add a note" maxLength={NOTE_MAX} name="body" placeholder="Add a note" />
        <Button type="submit" variant="outline">
          Add
        </Button>
      </notes.Form>
      <erase.Form className="mt-5 border-t border-border pt-4" method="post">
        <input name="leadId" type="hidden" value={lead.id} />
        <input name="intent" type="hidden" value="erase-lead" />
        <Button
          disabled={erase.state !== 'idle'}
          onClick={(event) => {
            if (
              !window.confirm(
                'Permanently delete this lead, including its notes and tags? This cannot be undone.',
              )
            )
              event.preventDefault();
          }}
          size="sm"
          type="submit"
          variant="destructive"
        >
          <Trash2Icon /> Permanently delete
        </Button>
      </erase.Form>
    </aside>
  );
}

function SectionLabel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground ${className}`}
    >
      {children}
    </p>
  );
}

function replySubject(lead: Lead) {
  return lead.subject ? `Re: ${lead.subject}` : `Re: your message`;
}

function formatDateTime(value: string) {
  // D1 stores CURRENT_TIMESTAMP as 'YYYY-MM-DD HH:MM:SS' with no zone marker.
  const normalised = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalised);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
