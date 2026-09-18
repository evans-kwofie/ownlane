/**
 * The auth provider is an implementation detail: none of its wording, branding
 * or docs links reach the screen. Every message a user sees is written here, in
 * Ownlane's voice, keyed off the provider's error code.
 */

export const IDENTIFIER_NOT_FOUND = 'form_identifier_not_found';

const MESSAGES: Record<string, string> = {
  [IDENTIFIER_NOT_FOUND]: 'We could not find that address. Check the spelling and try again.',
  form_identifier_exists: 'That address is already in use. Sign in instead.',
  form_param_format_invalid: 'That does not look like a valid email address.',
  form_param_nil: 'Fill this in to continue.',
  form_code_incorrect: 'That code is not right. Check the latest email and try again.',
  verification_expired: 'That code has expired. Send a new one to continue.',
  verification_failed: 'Too many attempts. Send a new code to continue.',
  too_many_requests: 'Too many attempts. Wait a moment, then try again.',
  session_exists: 'You are already signed in.',
};

export type AuthError = { code?: string; message?: string } | null;

export function authErrorMessage(error: AuthError, fallback = 'Something went wrong. Try again.') {
  const code = error?.code;
  return (code && MESSAGES[code]) || fallback;
}
