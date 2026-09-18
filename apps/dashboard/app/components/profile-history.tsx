import { useState } from 'react';
import { Calendar03Icon, Clock01Icon, ReloadIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@ownlane/ui/components/button';
import { FormSheet } from '@ownlane/ui/components/form-sheet';
import { useFetcher } from 'react-router';

import {
  relativeTime,
  type ProfileField,
  type ProfileVersion,
  type ScheduledChange,
} from '../lib/profiles';

/** Field names as people read them, for history and schedules. */
const FIELD_LABELS: Record<string, string> = {
  displayName: 'Display name',
  handle: 'Handle',
  pronunciation: 'Pronunciation',
  pronouns: 'Pronouns',
  profession: 'Profession',
  shortBio: 'Tagline',
  mediumBio: 'Summary',
  longBio: 'Full bio',
  categories: 'Categories',
  skills: 'Skills',
  languages: 'Languages',
  publicEmail: 'Email',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  bookingUrl: 'Booking link',
  websiteUrl: 'Website',
  city: 'City',
  country: 'Country',
  serviceArea: 'Service area',
  location: 'Location',
  timezone: 'Time zone',
  creatorType: 'Identity type',
  preferredContact: 'Preferred contact',
  remoteAvailability: 'Working style',
  availabilityStatus: 'Availability',
  visibility: 'Profile visibility',
};

export function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field;
}

/** "16 Sep 2026, 14:20" — the exact moment, for hovering over a relative one. */
function exactTime(iso: string) {
  const date = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);

  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * A timeline rather than a list: what is still to come sits above the present,
 * what already happened sits below it. Both are the same record changing over
 * time, so they belong on one line rather than in two unrelated panels.
 */
export function ProfileHistory({
  versions,
  scheduled,
}: {
  versions: ProfileVersion[];
  scheduled: ScheduledChange[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="h-8 gap-1.5 text-[13px]"
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={1.5} />
        History
        {scheduled.length ? (
          <span className="ml-0.5 rounded-full bg-ownlane-orange px-1.5 text-[11px] font-medium text-ownlane-black">
            {scheduled.length}
          </span>
        ) : null}
      </Button>

      <FormSheet
        description={
          <>
            {versions.length
              ? `${versions.length} saved ${versions.length === 1 ? 'change' : 'changes'}`
              : 'No changes saved yet'}
            {scheduled.length ? ` · ${scheduled.length} waiting to apply` : ''}. Every save is kept,
            and restoring writes an earlier state back as a new change.
          </>
        }
        onOpenChange={setOpen}
        open={open}
        size="wide"
        title="This profile over time"
      >
        <div className="-mx-1 max-h-[62vh] overflow-y-auto px-1 pb-1">
          <Section
            empty="Nothing is queued. Edit a field and choose Schedule instead of Save to plan a change."
            icon={Calendar03Icon}
            title="Coming up"
            tone="future"
          >
            {scheduled.map((change) => (
              <ScheduledEntry change={change} key={change.id} />
            ))}
          </Section>

          <div className="flex items-center gap-3 py-3 pl-[7px]">
            <span className="size-[9px] shrink-0 rounded-full border-2 border-ownlane-orange bg-background" />
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ownlane-orange">
              Now
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Section
            empty="Saved changes appear here, newest first, with a way back to any of them."
            icon={Clock01Icon}
            title="Already saved"
            tone="past"
          >
            {versions.map((version) => (
              <VersionEntry key={version.id} version={version} />
            ))}
          </Section>
        </div>
      </FormSheet>
    </>
  );
}

function Section({
  title,
  icon,
  tone,
  empty,
  children,
}: {
  title: string;
  icon: typeof Clock01Icon;
  tone: 'future' | 'past';
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <section>
      <h3 className="flex items-center gap-1.5 pb-1 text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground/70">
        <HugeiconsIcon icon={icon} size={13} strokeWidth={1.5} />
        {title}
      </h3>

      {children.length ? (
        <ol
          className={
            tone === 'future'
              ? 'border-l border-dashed border-ownlane-orange/50'
              : 'border-l border-border'
          }
        >
          {children}
        </ol>
      ) : (
        <p className="ml-[7px] border-l border-dashed border-border py-2 pl-5 text-[12.5px] leading-relaxed text-muted-foreground/80">
          {empty}
        </p>
      )}
    </section>
  );
}

function ScheduledEntry({ change }: { change: ScheduledChange }) {
  const fetcher = useFetcher();
  const fields = Object.keys(change.changes) as ProfileField[];

  return (
    <li className="relative pb-3 pl-5">
      <span className="absolute -left-[5px] top-[9px] size-[9px] rounded-full border-2 border-ownlane-orange bg-background" />

      <div className="rounded-lg border border-ownlane-orange/30 bg-ownlane-orange/[0.04] px-3.5 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-medium">Applies {relativeTime(change.applyAt)}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {exactTime(change.applyAt)}
            </p>
          </div>
          <fetcher.Form method="post">
            <input name="intent" type="hidden" value="cancel-schedule" />
            <input name="scheduleId" type="hidden" value={change.id} />
            <Button className="h-7 text-[12.5px]" type="submit" variant="ghost">
              Cancel
            </Button>
          </fetcher.Form>
        </div>

        <ul className="mt-2 space-y-1">
          {fields.map((field) => (
            <li className="flex gap-2 text-[12.5px]" key={field}>
              <span className="shrink-0 text-muted-foreground">{fieldLabel(field)}</span>
              <span className="min-w-0 truncate">→ {change.changes[field] || <em>empty</em>}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function VersionEntry({ version }: { version: ProfileVersion }) {
  const fetcher = useFetcher();
  const restoring = fetcher.state !== 'idle';

  return (
    <li className="relative pb-3 pl-5">
      <span className="absolute -left-[4px] top-[11px] size-[7px] rounded-full bg-border" />

      <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/70 bg-card px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium" title={exactTime(version.createdAt)}>
            {relativeTime(version.createdAt)}
          </p>
          <p className="mt-1 flex flex-wrap gap-1">
            {version.label ? (
              <span className="text-[12.5px] text-muted-foreground">{version.label}</span>
            ) : version.changedFields.length ? (
              version.changedFields.map((field) => (
                <span
                  className="rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[11.5px] text-muted-foreground"
                  key={field}
                >
                  {fieldLabel(field)}
                </span>
              ))
            ) : (
              <span className="text-[12.5px] text-muted-foreground">No fields recorded</span>
            )}
          </p>
        </div>

        <fetcher.Form method="post">
          <input name="intent" type="hidden" value="restore" />
          <input name="versionId" type="hidden" value={version.id} />
          <Button
            className="h-7 gap-1.5 text-[12.5px]"
            disabled={restoring}
            type="submit"
            variant="ghost"
          >
            <HugeiconsIcon icon={ReloadIcon} size={13} strokeWidth={1.5} />
            {restoring ? 'Restoring…' : 'Restore'}
          </Button>
        </fetcher.Form>
      </div>
    </li>
  );
}
