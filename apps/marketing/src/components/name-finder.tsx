'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@ownlane/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ownlane/ui/components/dialog';

type Check = { valid: boolean; free: boolean } | null;

export type NameStatus = 'idle' | 'checking' | 'free' | 'taken' | 'invalid' | 'error';

const CONFETTI = [
  { left: '8%', color: '#ff4d00', delay: '0ms', rotate: '18deg' },
  { left: '16%', color: '#111111', delay: '120ms', rotate: '-24deg' },
  { left: '25%', color: '#ffb299', delay: '40ms', rotate: '42deg' },
  { left: '35%', color: '#ff4d00', delay: '180ms', rotate: '-12deg' },
  { left: '45%', color: '#111111', delay: '80ms', rotate: '35deg' },
  { left: '55%', color: '#ffb299', delay: '220ms', rotate: '-35deg' },
  { left: '65%', color: '#ff4d00', delay: '20ms', rotate: '26deg' },
  { left: '74%', color: '#111111', delay: '150ms', rotate: '-18deg' },
  { left: '84%', color: '#ffb299', delay: '60ms', rotate: '48deg' },
  { left: '92%', color: '#ff4d00', delay: '200ms', rotate: '-28deg' },
];

export function NameFinder({
  appearance = 'default',
  autoFocus = false,
  id,
  onStatusChange,
}: {
  appearance?: 'default' | 'integrated';
  autoFocus?: boolean;
  id: string;
  onStatusChange?: (change: { handle: string; status: NameStatus }) => void;
}) {
  const [handle, setHandle] = useState('');
  const [check, setCheck] = useState<Check>(null);
  const [checkError, setCheckError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCheck = useRef<AbortController | null>(null);

  const checkAvailability = useCallback(async (rawHandle: string) => {
    const candidate = rawHandle.trim();
    if (!candidate) return;

    activeCheck.current?.abort();
    const controller = new AbortController();
    activeCheck.current = controller;
    setChecking(true);
    setCheckError(false);

    try {
      const response = await fetch(
        `/api/name-availability?handle=${encodeURIComponent(candidate)}`,
        { cache: 'no-store', signal: controller.signal },
      );
      if (!response.ok) throw new Error(`Availability check failed (${response.status})`);

      const nextCheck = (await response.json()) as Partial<NonNullable<Check>>;
      if (typeof nextCheck.valid !== 'boolean' || typeof nextCheck.free !== 'boolean') {
        throw new Error('Availability check returned an invalid response');
      }

      if (activeCheck.current === controller) {
        setCheck({ valid: nextCheck.valid, free: nextCheck.free });
        console.info('[ownlane:name-check] completed', {
          handle: candidate.toLowerCase(),
          valid: nextCheck.valid,
          free: nextCheck.free,
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (activeCheck.current === controller) {
        setCheck(null);
        setCheckError(true);
        console.error('[ownlane:name-check] failed', {
          handle: candidate.toLowerCase(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      if (activeCheck.current === controller) setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!handle.trim()) return;

    timer.current = setTimeout(() => void checkAvailability(handle), 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      activeCheck.current?.abort();
    };
  }, [checkAvailability, handle]);

  function updateHandle(value: string) {
    activeCheck.current?.abort();
    activeCheck.current = null;
    setHandle(value);
    setCheck(null);
    setCheckError(false);
    setChecking(Boolean(value.trim()));
    setDialogOpen(false);
  }

  function checkNow() {
    if (timer.current) clearTimeout(timer.current);
    void checkAvailability(handle);
  }

  const normalizedHandle = handle.trim().toLowerCase();
  const status: NameStatus = !normalizedHandle
    ? 'idle'
    : checking
      ? 'checking'
      : checkError
        ? 'error'
        : check && !check.valid
          ? 'invalid'
          : check?.free
            ? 'free'
            : 'taken';

  useEffect(() => {
    onStatusChange?.({ handle: normalizedHandle, status });
  }, [normalizedHandle, onStatusChange, status]);

  const startHref = `/api/start?handle=${encodeURIComponent(normalizedHandle)}`;
  const state = !normalizedHandle
    ? null
    : checking
      ? { text: 'Checking…', tone: 'muted' as const }
      : checkError
        ? { text: 'Could not check that name. Try again.', tone: 'warn' as const }
        : check && !check.valid
          ? { text: 'Use 2–30 characters; begin and end with a letter or number', tone: 'warn' as const }
          : check?.free
            ? { text: `${normalizedHandle} is available`, tone: 'good' as const }
            : { text: 'That name is already in use. Try another.', tone: 'warn' as const };

  return (
    <div className="max-w-[560px]">
      <div
        className={`flex items-center overflow-hidden rounded-xl border border-input bg-card shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/45 ${
          appearance === 'integrated' ? 'h-[64px] p-1.5' : 'h-[60px]'
        }`}
      >
        <span className="select-none pl-[18px] font-mono text-[16px] whitespace-nowrap text-muted-foreground">
          ownlane.com/
        </span>
        <input
          aria-label="Find your Ownlane name"
          autoComplete="off"
          autoFocus={autoFocus}
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-[10px] pl-px font-mono text-[16px] font-medium text-foreground outline-none"
          id={id}
          onChange={(event) => updateHandle(event.target.value)}
          placeholder="yourname"
          spellCheck={false}
          value={handle}
        />
        {appearance === 'integrated' ? (
          <Button
            className="mr-0.5 text-[13.5px]"
            disabled={!normalizedHandle || checking || Boolean(check && !check.valid) || check?.free === false}
            onClick={check?.free ? () => setDialogOpen(true) : checkNow}
            type="button"
          >
            {checking
              ? 'Checking…'
              : check?.free
                ? 'Continue'
                : checkError
                  ? 'Try again'
                  : 'Find my name'}
          </Button>
        ) : null}
      </div>

      {state ? (
        <p
          className={`mt-2.5 flex items-center gap-2 text-[13.5px] ${
            state.tone === 'good'
              ? 'text-[var(--chart-up)]'
              : state.tone === 'warn'
                ? 'text-[var(--chart-warn)]'
                : 'text-muted-foreground'
          }`}
        >
          {state.tone !== 'muted' ? <span className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
          {state.text}
        </p>
      ) : null}

      {check?.free && appearance === 'default' ? (
        <button
          className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          onClick={() => setDialogOpen(true)}
          type="button"
        >
          Continue with this name
        </button>
      ) : null}

      <p className="mt-3 text-[13px] text-muted-foreground">
        Start with a name or choose one later. Nothing is claimed until your account is created.
      </p>

      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-[460px]">
          <div className="relative overflow-hidden bg-[linear-gradient(145deg,rgba(255,77,0,0.16),rgba(255,77,0,0.04))] px-6 pt-10 pb-7 text-center">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-28 overflow-hidden">
              {CONFETTI.map((piece, index) => (
                <span
                  className="ownlane-confetti absolute top-0 h-3 w-1.5 rounded-[1px]"
                  key={`${piece.left}-${index}`}
                  style={{
                    left: piece.left,
                    backgroundColor: piece.color,
                    animationDelay: piece.delay,
                    rotate: piece.rotate,
                  }}
                />
              ))}
            </div>
            <div className="relative mx-auto grid size-12 place-items-center rounded-full bg-primary text-[20px] font-semibold text-primary-foreground shadow-[0_0_0_8px_rgba(255,77,0,0.1)]">
              ✓
            </div>
            <DialogHeader className="relative mt-5 items-center text-center">
              <DialogTitle className="text-[24px] tracking-[-0.04em]">
                {normalizedHandle} is available.
              </DialogTitle>
              <DialogDescription className="max-w-[38ch] text-[13.5px] leading-relaxed">
                We’ll carry this name into setup and create your Ownlane around it.
              </DialogDescription>
            </DialogHeader>
            <div className="relative mx-auto mt-4 inline-flex rounded-full border border-primary/20 bg-white/70 px-3 py-1.5 font-mono text-[12px] text-black/65">
              ownlane.com/{normalizedHandle}
            </div>
          </div>

          <div className="px-6 py-6">
            <a
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
              href={startHref}
            >
              Continue with this name
            </a>
            <p className="mt-3 text-center text-[11.5px] leading-relaxed text-muted-foreground">
              We’ll check it once more when your account is created.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
