import { EmailMessage } from 'cloudflare:email';

/**
 * Lead notifications, sent through Cloudflare Email Routing's `send_email`
 * binding.
 *
 * Cloudflare's binding may only deliver to an address that has been verified
 * as a destination on the account. That covers notifying the profile's owner,
 * which is the case this module needs. It cannot deliver to an arbitrary
 * address, so a confirmation copy to whoever filled the form is not possible
 * on this transport and is not attempted here — that needs a transactional
 * provider, and the sender instead gets an on-screen confirmation.
 *
 * Every failure is swallowed. A lead is already safely in the database by the
 * time this runs, and a bounced notification must never lose it.
 */
export async function sendLeadNotification(
  env: Env,
  input: {
    to: string;
    profileName: string;
    leadName: string;
    leadEmail: string;
    subject: string | null;
    message: string;
    leadUrl: string;
  },
): Promise<{ sent: boolean; reason?: string }> {
  const binding = env.LEAD_EMAIL;
  const from = env.LEAD_EMAIL_FROM;
  if (!binding || !from) return { sent: false, reason: 'not-configured' };

  const subject = `New enquiry from ${input.leadName}${input.subject ? ` — ${input.subject}` : ''}`;
  const body = [
    `${input.leadName} <${input.leadEmail}> wrote to ${input.profileName}:`,
    '',
    input.message,
    '',
    `Reply directly to this email, or open it in Ownlane:`,
    input.leadUrl,
  ].join('\r\n');

  try {
    await binding.send(
      new EmailMessage(
        from,
        input.to,
        mime({ from, to: input.to, subject, body, replyTo: input.leadEmail }),
      ),
    );
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : 'send-failed' };
  }
}

/**
 * A minimal RFC 5322 message. Headers are folded out of user input because a
 * newline in a header is a header-injection vector; the name reaches the body
 * intact either way.
 */
function mime(input: { from: string; to: string; subject: string; body: string; replyTo: string }) {
  const headers = [
    `From: Ownlane <${input.from}>`,
    `To: <${input.to}>`,
    `Reply-To: <${header(input.replyTo)}>`,
    `Subject: ${header(input.subject)}`,
    `Message-ID: <${crypto.randomUUID()}@ownlane>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
  ].join('\r\n');

  return `${headers}\r\n\r\n${input.body}`;
}

function header(value: string) {
  return value.replace(/[\r\n]+/g, ' ').slice(0, 900);
}
