import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';

import { Button } from '@ownlane/ui/components/button';
import { FormSheet } from '@ownlane/ui/components/form-sheet';
import { Input } from '@ownlane/ui/components/input';
import { Label } from '@ownlane/ui/components/label';
import { Textarea } from '@ownlane/ui/components/textarea';
import { cn } from '@ownlane/ui/lib/utils';

import { PushToggle } from './push-toggle';
import { useActionFeedback } from '../../../lib/action-feedback';
import type { ContactFormSettings } from '../../../features/audience/schema';

/**
 * How the public contact form presents itself.
 *
 * This belongs in profile configuration, alongside the other choices about how
 * the public site looks. It lives here until that route has a data layer —
 * today it is local state with no loader — so moving it is a lift, not a
 * rewrite.
 */
export function ContactFormSettingsSheet({
  open,
  onOpenChange,
  settings,
  turnstileConfigured,
  vapidPublicKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ContactFormSettings;
  turnstileConfigured: boolean;
  vapidPublicKey?: string;
}) {
  const fetcher = useFetcher<{ error?: string; saved?: string }>();
  const [isEnabled, setIsEnabled] = useState(settings.isEnabled);
  const [askSubject, setAskSubject] = useState(settings.askSubject);
  const [askPhone, setAskPhone] = useState(settings.askPhone);
  const [notifyOwner, setNotifyOwner] = useState(settings.notifyOwner);

  const saving = fetcher.state !== 'idle';

  // Saving with the sheet still open and nothing said reads as a dead button.
  // Errors stay in the banner below, where a form-level error belongs.
  useActionFeedback(fetcher.data, {
    onSuccess: () => onOpenChange(false),
    toastErrors: false,
  });

  // The sheet stays mounted between openings, so the switches have to follow
  // the server rather than keeping whatever they were last set to.
  useEffect(() => {
    setIsEnabled(settings.isEnabled);
    setAskSubject(settings.askSubject);
    setAskPhone(settings.askPhone);
    setNotifyOwner(settings.notifyOwner);
  }, [settings]);

  return (
    <FormSheet
      description="What the form asks for, and who hears about it."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Close
          </Button>
          <Button disabled={saving} form="contact-form-settings" type="submit">
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      side="right"
      size="wide"
      title="Contact form"
    >
      <fetcher.Form className="space-y-6" id="contact-form-settings" method="post">
        <input name="intent" type="hidden" value="save-form" />

        <section className="rounded-xl border border-border/70 p-4">
          <ToggleRow
            checked={isEnabled}
            description="Adds a message box under “Get in touch” on your public profile."
            label="Show the form"
            name="isEnabled"
            onChange={setIsEnabled}
          />
          <ToggleRow
            checked={askSubject}
            description="Adds the “What is this about?” dropdown."
            label="Require a subject"
            name="askSubject"
            onChange={setAskSubject}
          />
          <ToggleRow
            checked={askPhone}
            description="An optional field. Most people skip it."
            label="Ask for a phone number"
            name="askPhone"
            onChange={setAskPhone}
          />
        </section>

        <section className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cf-heading">Heading</Label>
            <Input
              defaultValue={settings.heading}
              id="cf-heading"
              maxLength={80}
              name="heading"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-intro">Intro line</Label>
            <Input defaultValue={settings.intro} id="cf-intro" maxLength={200} name="intro" />
            <p className="text-xs text-muted-foreground">
              A reply time here sets the expectation. Sits above the fields.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-consent">Consent wording</Label>
            <Textarea
              className="min-h-[76px]"
              defaultValue={settings.consentText}
              id="cf-consent"
              maxLength={400}
              name="consentText"
              required
            />
            <p className="text-xs text-muted-foreground">
              Stored word for word with every lead, so you can always show what someone agreed to.
              Changing it affects new messages only.
            </p>
          </div>
        </section>

        {/*
          Both ways of hearing about a lead, in one place. They are not the same
          kind of setting though — email is saved with this form and applies to
          the whole workspace, push belongs to the browser you are sitting at and
          saves on click. The chip and the note below carry that distinction.
        */}
        <section className="rounded-xl border border-border/70 p-4">
          <p className="text-[13px] font-medium">Notifications</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            The inbox keeps every lead regardless. These are just how you hear about one.
          </p>

          <div className="mt-3 border-t border-border">
            {/*
              The toggle and the address it needs are one setting, so they sit
              inside a single bordered group. ToggleRow is this group's only
              direct row, so its own divider collapses and the address is never
              fenced off from the switch that reveals it.
            */}
            <div className="border-b border-border py-3.5">
              <ToggleRow
                checked={notifyOwner}
                description="Saved with these settings, so it applies wherever you sign in."
                label="Email me each lead"
                name="notifyOwner"
                onChange={setNotifyOwner}
              />
              {notifyOwner ? (
                <div className="mt-3 space-y-1.5">
                  <Label className="text-[12.5px] font-normal" htmlFor="cf-notify">
                    Send to
                  </Label>
                  <Input
                    defaultValue={settings.notifyEmail ?? ''}
                    id="cf-notify"
                    name="notifyEmail"
                    placeholder="you@yourdomain.com"
                    type="email"
                  />
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                    Cloudflare Email Routing delivers only to an address verified as a destination
                    on your account, so add this one there first or the notification is dropped.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="py-3.5">
              <PushToggle vapidPublicKey={vapidPublicKey} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border/70 p-4">
          <p className="text-[13px] font-medium">Spam protection</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {turnstileConfigured
              ? 'Turnstile is configured and runs invisibly for almost everyone.'
              : 'Turnstile is not configured. The form still works and keeps its honeypot and rate limit, but a public form without a challenge fills with bot submissions within days. Set VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY.'}
          </p>
        </section>

        {fetcher.data?.error ? (
          <p
            className="rounded-lg border px-3.5 py-2.5 text-[13px]"
            role="alert"
            style={{
              borderColor: 'color-mix(in srgb, var(--chart-down) 40%, transparent)',
              background: 'color-mix(in srgb, var(--chart-down) 8%, var(--card))',
            }}
          >
            {fetcher.data.error}
          </p>
        ) : null}
      </fetcher.Form>
    </FormSheet>
  );
}

/**
 * A switch that submits. The hidden input carries the value because an
 * unchecked checkbox sends nothing, and "off" has to reach the server.
 */
function ToggleRow({
  checked,
  description,
  label,
  name,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  name: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div>
        <p className="text-[13px]">{label}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>
      </div>
      <input name={name} type="hidden" value={checked ? 'true' : ''} />
      <button
        aria-checked={checked}
        aria-label={label}
        className={cn(
          'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-[18px] after:rounded-full after:bg-white after:shadow-sm after:transition-transform',
          checked ? 'bg-primary after:translate-x-4' : 'bg-foreground/15',
        )}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      />
    </div>
  );
}
