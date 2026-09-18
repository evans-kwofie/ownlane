import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, useSignIn, useSignUp } from '@clerk/react-router';

import { Button } from '@ownlane/ui/components/button';
import { Input } from '@ownlane/ui/components/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@ownlane/ui/components/input-otp';
import { Label } from '@ownlane/ui/components/label';

import { AuthShell } from '../components/auth-shell';
import { GoogleMark } from '../components/google-mark';
import { type AuthError, IDENTIFIER_NOT_FOUND, authErrorMessage } from '../lib/auth-errors';
import type { Route } from './+types/home';

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Sign in — Ownlane' },
    { name: 'description', content: 'One profile. Every platform. Always current.' },
  ];
}

const CODE_LENGTH = 6;
const AFTER_SIGN_IN = '/app';
const SSO_CALLBACK = '/continue';

type Step = 'email' | 'code';

export default function Home() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  /** Whether the emailed code belongs to a new account rather than an existing one. */
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = Boolean(signIn && signUp);

  useEffect(() => {
    if (isSignedIn) navigate(AFTER_SIGN_IN, { replace: true });
  }, [isSignedIn, navigate]);

  /**
   * Mails a one-time code. Existing accounts sign in; an unknown address opens a
   * new account with the same code, so the user only ever sees one path.
   */
  async function sendCode(address: string): Promise<AuthError> {
    const signInAttempt = await signIn!.emailCode.sendCode({ emailAddress: address });
    if (!signInAttempt.error) {
      setIsNewAccount(false);
      return null;
    }
    if (signInAttempt.error.code !== IDENTIFIER_NOT_FOUND) return signInAttempt.error;

    const created = await signUp!.create({ emailAddress: address });
    if (created.error) return created.error;

    const sent = await signUp!.verifications.sendEmailCode();
    if (sent.error) return sent.error;

    setIsNewAccount(true);
    return null;
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || pending) return;

    setPending(true);
    setError(null);

    const failure = await sendCode(email.trim());
    if (failure) {
      setError(authErrorMessage(failure, 'We could not send that code. Try again.'));
    } else {
      setCode('');
      setStep('code');
    }
    setPending(false);
  }

  async function handleCodeSubmit(value: string) {
    if (!ready || pending) return;

    setPending(true);
    setError(null);

    const verified = isNewAccount
      ? await signUp!.verifications.verifyEmailCode({ code: value })
      : await signIn!.emailCode.verifyCode({ code: value });

    if (verified.error) {
      setCode('');
      setError(authErrorMessage(verified.error, 'That code did not work. Try again.'));
      setPending(false);
      return;
    }

    const finalized = isNewAccount
      ? await signUp!.finalize({ navigate: () => navigate(AFTER_SIGN_IN, { replace: true }) })
      : await signIn!.finalize({ navigate: () => navigate(AFTER_SIGN_IN, { replace: true }) });

    if (finalized.error) {
      setError(authErrorMessage(finalized.error, 'We could not finish signing you in. Try again.'));
      setPending(false);
    }
  }

  async function handleGoogle() {
    if (!ready || pending) return;

    setPending(true);
    setError(null);

    const { error: failure } = await signIn!.sso({
      strategy: 'oauth_google',
      redirectUrl: AFTER_SIGN_IN,
      redirectCallbackUrl: SSO_CALLBACK,
    });

    if (failure) {
      setError(authErrorMessage(failure, 'We could not reach Google. Try again.'));
      setPending(false);
    }
  }

  async function handleResend() {
    if (!ready || pending) return;

    setPending(true);
    setError(null);

    const failure = await sendCode(email.trim());
    if (failure) {
      setError(authErrorMessage(failure, 'We could not send another code. Try again.'));
    } else {
      setCode('');
    }
    setPending(false);
  }

  if (step === 'code') {
    return (
      <AuthShell
        title="Check your email"
        description={
          <>
            We sent a {CODE_LENGTH}-digit code to <span className="text-foreground">{email}</span>.
            It expires in ten minutes.
          </>
        }
        footnote={
          <>
            Wrong address?{' '}
            <button
              className="text-foreground underline underline-offset-4 transition-opacity hover:opacity-70 disabled:opacity-50"
              disabled={pending}
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              type="button"
            >
              Start over
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <InputOTP
            autoFocus
            containerClassName="w-full"
            disabled={pending}
            maxLength={CODE_LENGTH}
            onChange={(value) => {
              setCode(value);
              if (value.length === CODE_LENGTH) void handleCodeSubmit(value);
            }}
            value={code}
          >
            <InputOTPGroup className="w-full gap-2">
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
                <InputOTPSlot
                  className="h-12 flex-1 rounded-lg border border-input bg-background text-[17px] font-medium first:rounded-lg last:rounded-lg"
                  index={index}
                  key={index}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <AuthErrorNotice message={error} />

          <div className="flex items-center justify-between text-[13px] text-muted-foreground">
            <span>{pending ? 'Checking your code…' : 'Enter the code to continue'}</span>
            <button
              className="font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70 disabled:opacity-50"
              disabled={pending}
              onClick={handleResend}
              type="button"
            >
              Resend
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign in to Ownlane"
      description="Manage the profile people find across every platform."
      footnote={
        <>
          By continuing you agree to our{' '}
          <a className="text-foreground underline underline-offset-4" href="/terms">
            Terms
          </a>{' '}
          and{' '}
          <a className="text-foreground underline underline-offset-4" href="/privacy">
            Privacy Policy
          </a>
          .
        </>
      }
    >
      <div className="space-y-5">
        <Button
          className="h-11 w-full gap-2.5 rounded-lg border-input bg-background text-[14px] font-medium"
          disabled={!ready || pending}
          onClick={handleGoogle}
          type="button"
          variant="outline"
        >
          <GoogleMark className="size-[18px]" />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={handleEmailSubmit}>
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-foreground/80" htmlFor="email">
              Email
            </Label>
            <Input
              autoComplete="email"
              className="h-11 rounded-lg bg-background px-3.5 text-[14px] placeholder:text-muted-foreground/70"
              disabled={pending}
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>

          <Button
            className="h-11 w-full rounded-lg bg-foreground text-[14px] font-medium text-background hover:bg-foreground/90"
            disabled={!ready || pending}
            type="submit"
          >
            {pending ? 'Sending code…' : 'Continue with email'}
          </Button>
        </form>

        <AuthErrorNotice message={error} />

        <p className="text-center text-[13px] text-muted-foreground">
          New here? Use your email — we will set your account up as you sign in.
        </p>
      </div>
    </AuthShell>
  );
}

function AuthErrorNotice({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p className="text-[13px] leading-relaxed text-destructive" role="alert">
      {message}
    </p>
  );
}
