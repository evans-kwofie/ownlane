'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { SimpleIcon } from 'simple-icons';
import { siGithub, siInstagram, siX, siYoutube } from 'simple-icons';

function BrandIcon({ icon }: { icon: SimpleIcon }) {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d={icon.path} />
    </svg>
  );
}

function Box({ children, title, meta }: { children: ReactNode; title: string; meta?: string }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      <div className="flex justify-between border-b border-white/10 px-4 py-3 font-mono text-[10px] tracking-[0.08em] text-white/36 uppercase">
        <span>{title}</span>
        {meta ? <span>{meta}</span> : null}
      </div>
      {children}
    </div>
  );
}

function IdentityRecord() {
  return (
    <Box title="Identity record">
      {[
        ['Name', 'Sophie Miller'],
        ['Role', 'Creative director'],
        ['Location', 'London, UK'],
        ['Bio', 'Designing useful things'],
      ].map(([field, value]) => (
        <div
          className="grid grid-cols-[72px_1fr] gap-2.5 border-b border-white/10 px-4 py-[13px] text-[13px] last:border-b-0"
          key={field}
        >
          <span className="self-center font-mono text-[10px] tracking-[0.06em] text-white/36 uppercase">
            {field}
          </span>
          <span className="truncate">{value}</span>
        </div>
      ))}
    </Box>
  );
}

function ConnectedAccounts() {
  const accounts = [
    { name: 'Instagram', icon: siInstagram, access: 'Write' },
    { name: 'GitHub', icon: siGithub, access: 'Read' },
    { name: 'YouTube', icon: siYoutube, access: 'Guided' },
    { name: 'X', icon: siX, access: 'Read' },
  ];

  return (
    <Box meta="4 accounts" title="Connected">
      {accounts.map((account) => (
        <div
          className="flex items-center gap-3 border-b border-white/10 px-4 py-[13px] text-[13px] last:border-b-0"
          key={account.name}
        >
          <span className="grid size-[26px] place-items-center rounded-[7px] border border-white/10 text-white/70">
            <BrandIcon icon={account.icon} />
          </span>
          {account.name}
          <span
            className={`ml-auto font-mono text-[10px] tracking-[0.06em] uppercase ${
              account.access === 'Write' ? 'text-[var(--chart-up)]' : 'text-white/36'
            }`}
          >
            {account.access}
          </span>
        </div>
      ))}
    </Box>
  );
}

const updates = [
  { name: 'Instagram', status: 'Ready to update', action: 'Update' },
  { name: 'GitHub', status: 'Difference found', action: 'Review' },
  { name: 'YouTube', status: 'Guided change', action: 'Guide me' },
  { name: 'X', status: 'Connection expired', action: 'Reconnect' },
];

function UpdateList() {
  const [current, setCurrent] = useState<boolean[]>([false, false, false, false]);
  const remaining = current.filter((done) => !done).length;

  return (
    <Box meta={remaining === 0 ? 'All current' : `${remaining} to go`} title="Updates">
      {updates.map((update, index) => {
        const done = current[index];
        return (
          <div
            className="grid grid-cols-[1fr_auto] items-center gap-2.5 border-b border-white/10 px-4 py-3 last:border-b-0"
            key={update.name}
          >
            <div>
              <p className="text-[13px] font-medium">{update.name}</p>
              <p className="mt-[3px] text-[11.5px] text-white/36">{done ? 'Current' : update.status}</p>
            </div>
            <button
              className={`min-w-[84px] rounded-lg border px-[11px] py-1.5 text-[11.5px] font-medium transition-colors ${
                done
                  ? 'cursor-default border-transparent text-[var(--chart-up)]'
                  : `border-white/10 hover:bg-white hover:text-black ${update.action === 'Reconnect' ? 'text-primary' : ''}`
              }`}
              disabled={done}
              onClick={() => setCurrent((state) => state.map((value, i) => (i === index ? true : value)))}
              type="button"
            >
              {done ? 'Current ✓' : update.action}
            </button>
          </div>
        );
      })}
    </Box>
  );
}

const steps = [
  {
    number: '01',
    title: 'Define what is true',
    body: 'Keep the name, biography, image, links, and details that represent you now in one complete record.',
    visual: <IdentityRecord />,
  },
  {
    number: '02',
    title: 'Connect where it lives',
    body: 'Add the accounts and destinations where people meet you. Ownlane records what each one permits.',
    visual: <ConnectedAccounts />,
  },
  {
    number: '03',
    title: 'Keep every version current',
    body: 'Preview differences, update supported fields, and follow exact guided steps everywhere else.',
    visual: <UpdateList />,
  },
];

export function HowOwnlaneWorks() {
  return (
    <section className="scroll-mt-24 bg-black py-20 text-white lg:py-24" id="how-it-works">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1200px]">
        <div className="grid items-end gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <h2 className="max-w-[15ch] text-[clamp(2rem,3.3vw,3rem)] leading-[0.97] font-semibold tracking-[-0.055em] text-balance">
            How one identity stays current everywhere.
          </h2>
          <p className="max-w-[48ch] text-[15.5px] leading-[1.72] text-white/52 lg:pb-1">
            Ownlane turns a scattered online presence into one clear workflow. You decide what is
            true, see where it differs, and know exactly what happens next.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-12 md:grid-cols-3">
          {steps.map((step) => (
            <div className="min-w-0" key={step.number}>
              <div className="flex h-[320px] items-center rounded-2xl border border-white/10 bg-[#0d0d0c] p-5">
                {step.visual}
              </div>
              <p className="mt-7 font-mono text-[11px] tracking-[0.1em] text-primary">{step.number}</p>
              <h3 className="mt-2.5 text-[20px] font-semibold tracking-[-0.035em]">{step.title}</h3>
              <p className="mt-2.5 max-w-[36ch] text-[14.5px] leading-[1.65] text-white/52">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
