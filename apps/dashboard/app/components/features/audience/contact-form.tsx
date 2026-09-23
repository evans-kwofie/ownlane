import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';

import { MESSAGE_MAX, type ContactFormSettings } from '../../../features/audience/schema';

type CaptureResponse = {
  ok: boolean;
  formErrors?: Record<string, string>;
  message?: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

/**
 * The inbound half of "Get in touch". Posts to /contact/:slug, which validates
 * the same schema again before writing anything — this form's validation is
 * for feedback, never for trust.
 */
export function ContactForm({
  settings,
  slug,
  turnstileSiteKey,
}: {
  settings: ContactFormSettings;
  slug: string;
  turnstileSiteKey?: string;
}) {
  const fetcher = useFetcher<CaptureResponse>();
  const [length, setLength] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const sending = fetcher.state !== 'idle';
  const sent = showSuccess;
  const errors = fetcher.data?.formErrors ?? {};

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) {
      formRef.current?.reset();
      setLength(0);
      setShowSuccess(true);
    }
  }, [fetcher.data, fetcher.state]);

  if (sent) {
    return (
      <div className="rounded-xl border border-border px-6 py-10 text-center">
        <p className="text-[15px] font-medium">Message sent</p>
        <p className="mx-auto mt-1.5 max-w-[42ch] text-[13.5px] leading-relaxed text-muted-foreground">
          It has arrived. You will hear back at the address you gave.
        </p>
        <button
          className="mt-4 text-[13px] font-medium underline underline-offset-4"
          onClick={() => setShowSuccess(false)}
          type="button"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <fetcher.Form
      action={`/contact/${slug}`}
      className="flex flex-col gap-4"
      method="post"
      noValidate
      ref={formRef}
    >
      {/* Never shown to a person. Anything in it is automation. */}
      <input
        aria-hidden="true"
        autoComplete="off"
        className="absolute left-[-9999px] size-px"
        name="website"
        tabIndex={-1}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field error={errors.name} htmlFor="lead-name" label="Name">
          <input
            autoComplete="name"
            className={input(errors.name)}
            id="lead-name"
            maxLength={120}
            name="name"
            required
          />
        </Field>
        <Field error={errors.email} htmlFor="lead-email" label="Email">
          <input
            autoComplete="email"
            className={input(errors.email)}
            id="lead-email"
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </Field>
      </div>

      {settings.askPhone ? (
        <Field error={errors.phone} htmlFor="lead-phone" label="Phone (optional)">
          <input
            autoComplete="tel"
            className={input(errors.phone)}
            id="lead-phone"
            maxLength={40}
            name="phone"
            type="tel"
          />
        </Field>
      ) : null}

      {settings.askSubject ? (
        <Field error={errors.subject} htmlFor="lead-subject" label="What is this about?">
          <select
            className={input(errors.subject)}
            defaultValue=""
            id="lead-subject"
            name="subject"
          >
            <option value="">Choose one</option>
            <option>New project enquiry</option>
            <option>Speaking or press</option>
            <option>Collaboration</option>
            <option>Something else</option>
          </select>
        </Field>
      ) : null}

      <Field error={errors.message} htmlFor="lead-message" label="Message">
        <textarea
          className={`${input(errors.message)} min-h-[104px] resize-y`}
          id="lead-message"
          maxLength={MESSAGE_MAX}
          name="message"
          onChange={(event) => setLength(event.target.value.length)}
          required
        />
        <span className="text-xs text-muted-foreground">
          {length.toLocaleString()} of {MESSAGE_MAX.toLocaleString()} characters
        </span>
      </Field>

      <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
        <input className="mt-0.5 size-4 shrink-0 accent-primary" name="consent" type="checkbox" />
        <span>{settings.consentText}</span>
      </label>
      {errors.consent ? <FieldError>{errors.consent}</FieldError> : null}

      {turnstileSiteKey ? <Turnstile lastResult={fetcher.data} siteKey={turnstileSiteKey} /> : null}

      {fetcher.data && !fetcher.data.ok && fetcher.data.message ? (
        <p
          className="rounded-lg border px-3.5 py-2.5 text-[13px]"
          role="alert"
          style={{
            borderColor: 'color-mix(in srgb, var(--chart-down) 40%, transparent)',
            background: 'color-mix(in srgb, var(--chart-down) 8%, var(--card))',
          }}
        >
          {fetcher.data.message}
        </p>
      ) : null}

      <button
        className="rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        disabled={sending}
        type="submit"
      >
        {sending ? 'Sending…' : 'Send message'}
      </button>
    </fetcher.Form>
  );
}

/** Renders the Turnstile widget once its script has loaded. */
function Turnstile({
  lastResult,
  siteKey,
}: {
  /** The most recent capture response, whatever it was. */
  lastResult: CaptureResponse | undefined;
  siteKey: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const node = host.current;
    if (!node) return;

    function render() {
      if (node && window.turnstile && !node.firstChild) {
        widgetId.current = window.turnstile.render(node, {
          sitekey: siteKey,
          'response-field-name': 'turnstileToken',
        });
      }
    }

    if (window.turnstile) {
      render();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [siteKey]);

  // A Turnstile token is single-use, so every rejected submission needs a fresh
  // one or the retry re-sends a spent token and can never succeed.
  //
  // Keyed on the response object, not on a derived `failed` boolean: two
  // rejections in a row leave that boolean stuck at true, the effect never
  // re-runs, and the visitor is trapped from the second attempt onwards. Each
  // response is a new object, so this fires once per rejection.
  useEffect(() => {
    if (lastResult && !lastResult.ok && widgetId.current) {
      window.turnstile?.reset(widgetId.current);
    }
  }, [lastResult]);

  return <div ref={host} />;
}

function Field({
  children,
  error,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13.5px] font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12.5px]" style={{ color: 'var(--chart-down)' }}>
      {children}
    </span>
  );
}

function input(error?: string) {
  return `w-full rounded-lg border bg-card px-3 py-2.5 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    error ? 'border-[var(--chart-down)]' : 'border-border'
  }`;
}
