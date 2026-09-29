'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Same tile background as the capability gallery.
const TILE_BACKGROUND = '/images/tile-pattern.svg';

const OLD_ROLE = 'Freelance designer';
const NEW_ROLE = 'Creative director';

const destinations = [
  { name: 'Connected profile', logo: 'Pr', method: 'direct', before: 'Freelance designer' },
  { name: 'Portfolio', logo: 'Po', method: 'direct', before: 'Independent designer' },
  {
    name: 'Professional network',
    logo: 'Pn',
    method: 'guided',
    before: 'Product designer',
    where: 'Profile → Edit intro → Headline',
  },
  {
    name: 'Creator channel',
    logo: 'Cc',
    method: 'guided',
    before: 'Designer & maker',
    where: 'Customize channel → About',
  },
] as const;

type RowState = 'idle' | 'working' | 'done' | 'ready' | 'copied';

const idle: RowState[] = ['idle', 'idle', 'idle', 'idle'];

function Tick() {
  return (
    <svg
      aria-hidden
      className="ownlane-tick size-3.5 text-[var(--chart-up)]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 14 14"
    >
      <path d="M2.5 7.5l3 3 6-6.5" />
    </svg>
  );
}

export function ChangeScenario() {
  const [rows, setRows] = useState<RowState[]>(idle);
  const [stage, setStage] = useState(-1);
  const [typed, setTyped] = useState(OLD_ROLE);
  const [typing, setTyping] = useState(false);
  const timers = useRef<number[]>([]);
  const typer = useRef<number | undefined>(undefined);

  const clearAll = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    window.clearInterval(typer.current);
  }, []);

  useEffect(() => clearAll, [clearAll]);

  const later = (ms: number, fn: () => void) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timers.current.push(window.setTimeout(fn, reduce ? 0 : ms));
  };

  const setRow = (index: number, value: RowState) =>
    setRows((current) => current.map((row, i) => (i === index ? value : row)));

  const current = rows.filter((row) => row === 'done' || row === 'copied').length;
  const waiting = rows.filter((row) => row === 'ready').length;
  const started = stage >= 0;

  const reset = () => {
    clearAll();
    setRows(idle);
    setStage(-1);
    setTyping(false);
    setTyped(OLD_ROLE);
  };

  const run = () => {
    if (started) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setTyped(NEW_ROLE);
    } else {
      let count = 0;
      setTyping(true);
      setTyped('');
      typer.current = window.setInterval(() => {
        count += 1;
        setTyped(NEW_ROLE.slice(0, count));
        if (count >= NEW_ROLE.length) {
          window.clearInterval(typer.current);
          setTyping(false);
        }
      }, 38);
    }
    later(900, () => setStage(0));
    later(2000, () => {
      setStage(1);
      [0, 1].forEach((index) => {
        later(400 + index * 900, () => setRow(index, 'working'));
        later(1100 + index * 900, () => setRow(index, 'done'));
      });
      later(3100, () => {
        setRows((state) => state.map((row, i) => (destinations[i].method === 'guided' ? 'ready' : row)));
        setStage(2);
      });
    });
  };

  const copy = (index: number) => {
    void navigator.clipboard?.writeText(NEW_ROLE).catch(() => undefined);
    setRow(index, 'copied');
  };

  const steps = [
    { title: 'Preview', detail: !started ? 'Review 4 differences' : '4 differences found' },
    {
      title: 'Act',
      detail:
        stage < 1
          ? '2 direct · 2 guided'
          : stage === 1
            ? 'Updating direct…'
            : `Direct done · ${waiting} waiting for you`,
    },
    {
      title: 'Verify',
      detail: current === 4 ? 'All 4 current' : stage >= 2 ? `${current} of 4 · ${4 - current} left` : 'Waiting',
    },
  ];

  const stepState = (index: number) =>
    (index === 2 && current === 4) || (index === 1 && stage >= 2) || stage > index
      ? 'done'
      : stage === index
        ? 'active'
        : 'todo';

  return (
    <section className="bg-background text-foreground" id="change-scenario">
      <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1200px] grid-cols-[minmax(0,1fr)] items-center gap-14 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:py-24">
        <div>
          <p className="font-mono text-[9px] tracking-[0.13em] text-black/42 uppercase">
            One change, every place
          </p>
          <h2 className="mt-5 max-w-[15ch] text-[clamp(2rem,3.3vw,3rem)] leading-[0.98] font-semibold tracking-[-0.058em] text-balance">
            A new role should take one edit, not an afternoon.
          </h2>
          <p className="mt-6 max-w-[42ch] text-[15.5px] leading-[1.68] text-black/55">
            See the difference before anything changes. Ownlane separates updates it can make from
            the exact steps that still need you.
          </p>

          <ol className="mt-10">
            {steps.map((step, index) => {
              const state = stepState(index);
              return (
                <li
                  className="relative grid grid-cols-[26px_1fr] gap-3 pb-5 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-[26px] [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:left-3 [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-black/10"
                  key={step.title}
                >
                  <span
                    className={`z-10 grid size-[26px] place-items-center rounded-full border font-mono text-[10px] transition-all ${
                      state === 'done'
                        ? 'border-black bg-black text-white'
                        : state === 'active'
                          ? 'border-primary bg-white text-primary shadow-[0_0_0_4px_rgba(255,77,0,0.09)]'
                          : 'border-black/10 bg-white text-black/38'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className={`mt-1 text-[13px] font-semibold ${state === 'todo' ? 'text-black/55' : ''}`}>
                      {step.title}
                    </p>
                    <p className="mt-[3px] text-[12px] text-black/40 tabular-nums">{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <button
              className="flex h-[42px] items-center justify-center rounded-[11px] bg-black px-5 text-[13px] font-medium text-white transition hover:-translate-y-px disabled:translate-y-0 disabled:opacity-55"
              disabled={started}
              onClick={run}
              type="button"
            >
              {!started ? 'Apply the example change' : stage < 2 ? 'Working…' : current === 4 ? 'Applied' : 'Waiting on you'}
            </button>
            {started ? (
              <button
                className="text-[12px] text-black/55 underline underline-offset-[3px]"
                onClick={reset}
                type="button"
              >
                Show the previous state
              </button>
            ) : null}
          </div>
        </div>

        <div
          className="relative h-[660px] min-w-0 overflow-hidden rounded-2xl bg-cover bg-center"
          style={{ backgroundImage: `url(${TILE_BACKGROUND})` }}
        >
          <div className="absolute top-[5%] left-[7%] flex h-full w-full flex-col rounded-tl-[14px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(11,11,10,0.04),0_14px_34px_-12px_rgba(11,11,10,0.2)]">
            <div className="border-b border-black/10 px-[22px] py-[18px]">
              <p className="font-mono text-[9px] tracking-[0.12em] text-black/38 uppercase">
                Change in Ownlane
              </p>
              <p
                className={`mt-3 text-[13px] text-black/38 line-through transition-opacity ${
                  started ? 'opacity-60' : ''
                }`}
              >
                {OLD_ROLE}
              </p>
              <p className="mt-1 min-h-[30px] text-[24px] font-semibold tracking-[-0.045em]">
                {typed}
                {typing ? <span className="ownlane-caret ml-0.5 inline-block h-[22px] w-0.5 bg-primary align-[-3px]" /> : null}
              </p>
            </div>

            <div className="flex items-center gap-3.5 border-b border-black/10 bg-[#f6f6f2] px-[22px] py-3">
              <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-[var(--chart-up)] transition-[width] duration-[600ms]"
                  style={{ width: `${(current / 4) * 100}%` }}
                />
              </div>
              <span className="pr-10 font-mono text-[11px] whitespace-nowrap text-black/55 tabular-nums">
                {current} of 4 current
              </span>
            </div>

            {destinations.map((destination, index) => {
              const state = rows[index];
              const changed = state !== 'idle' || started;
              const finished = state === 'done' || state === 'copied';
              return (
                <div
                  className="grid grid-cols-[38px_1fr_auto] items-start gap-3.5 border-b border-black/10 px-[22px] py-4"
                  key={destination.name}
                >
                  <span className="grid size-[38px] place-items-center rounded-[10px] bg-[#efeee9] text-[13px] font-semibold tracking-[-0.03em]">
                    {destination.logo}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
                      {destination.name}
                      <span
                        className={`rounded-full px-[7px] py-0.5 font-mono text-[9px] tracking-[0.06em] uppercase ${
                          destination.method === 'guided'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-[#efeee9] text-black/55'
                        }`}
                      >
                        {destination.method === 'guided' ? 'Guided' : 'Direct'}
                      </span>
                    </p>
                    <p className="mt-2 flex min-h-[22px] flex-wrap items-center gap-[9px] text-[13px]">
                      {stage >= 1 ? (
                        <>
                          <s className="text-black/38">{destination.before}</s>
                          <span aria-hidden className="text-[12px] text-black/38">→</span>
                          <span className="ownlane-slide-in rounded-md bg-[var(--chart-up)]/10 px-[7px] py-px font-medium">
                            {NEW_ROLE}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>{destination.before}</span>
                          {stage === 0 ? (
                            <>
                              <span aria-hidden className="text-[12px] text-black/38">→</span>
                              <span className="text-black/45">{NEW_ROLE}</span>
                            </>
                          ) : null}
                        </>
                      )}
                    </p>
                    {destination.method === 'guided' && (state === 'ready' || state === 'copied') ? (
                      <p className="ownlane-slide-in mt-2.5 flex flex-wrap items-center gap-2 text-[12px] text-black/55">
                        <span>{destination.where}</span>
                        <button
                          className={`rounded-lg border px-2.5 py-[5px] text-[11.5px] font-medium transition-colors ${
                            state === 'copied'
                              ? 'border-transparent bg-[var(--chart-up)]/10 text-[var(--chart-up)]'
                              : 'border-black/10 bg-white text-black hover:border-black'
                          }`}
                          onClick={() => copy(index)}
                          type="button"
                        >
                          {state === 'copied' ? 'Copied' : 'Copy new text'}
                        </button>
                      </p>
                    ) : null}
                  </div>
                  <div
                    className={`flex items-center gap-[7px] pt-[3px] pr-10 text-[12px] whitespace-nowrap ${
                      finished ? 'text-[var(--chart-up)]' : state === 'ready' ? 'text-primary' : 'text-black/38'
                    }`}
                  >
                    {state === 'working' ? (
                      <>
                        <span className="size-3 animate-spin rounded-full border-[1.5px] border-black/10 border-t-primary" />
                        Updating
                      </>
                    ) : finished ? (
                      <>
                        <Tick />
                        {state === 'copied' ? 'Done' : 'Updated'}
                      </>
                    ) : state === 'ready' ? (
                      'Ready'
                    ) : changed ? (
                      'Queued'
                    ) : (
                      'Not changed'
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
