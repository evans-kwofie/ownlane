'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Swap this one path to change the tile background for all three mockups.
const TILE_BACKGROUND = '/images/tile-pattern.svg';

const assets = [
  { mark: 'Sophie M.', name: 'Wordmark', meta: 'v3 · SVG, PNG', size: 11, usedOn: ['Instagram', 'LinkedIn', 'Portfolio'] },
  { mark: 'SM', name: 'Monogram', meta: 'v3 · 6 sizes', size: 17, usedOn: ['Favicon', 'GitHub', 'Substack'] },
  { mark: 'S', name: 'Avatar', meta: 'v2 · round crop', size: 22, usedOn: ['X', 'Threads', 'YouTube'] },
];

const palette = ['#0b0b0a', '#f8f3ec', '#ff4d00', '#2b5d4b', '#c9bfae'];

const leads = [
  { initials: 'AM', name: 'Amara Mensah', message: 'Asked about a brand identity for a spring launch', source: 'Link in bio', time: '9:14' },
  { initials: 'JS', name: 'Jonas Steiner', message: 'Wants to book a 30 minute intro call', source: 'Book a project', time: '9:22' },
  { initials: 'NL', name: 'Nia Lopez', message: 'Downloaded the Northbank case study', source: 'Portfolio', time: '9:41' },
  { initials: 'RK', name: 'Ravi Kapoor', message: 'Found you through a newsletter mention', source: 'Substack', time: '10:05' },
  { initials: 'EO', name: 'Efua Owusu', message: 'Requested a quote for packaging design', source: 'Instagram', time: '10:18' },
  { initials: 'TB', name: 'Tom Brandt', message: 'Replied to the autumn announcement', source: 'Email', time: '10:32' },
];

const destinations = [
  { title: 'Selected work', url: 'studio.example/work', tag: 'bio', ok: true },
  { title: 'Book a project', url: 'cal.com/sophie', tag: 'ig', ok: true },
  { title: 'Autumn launch', url: 'studio.example/launch', tag: 'autumn', ok: false },
];

type LinkState = 'check' | 'ok' | 'bad';

function Tile({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative h-[400px] overflow-hidden rounded-2xl bg-cover bg-center"
      style={{ backgroundImage: `url(${TILE_BACKGROUND})` }}
    >
      <div className="absolute top-[13%] left-[11%] flex h-full w-full flex-col rounded-tl-[14px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(11,11,10,0.04),0_14px_34px_-12px_rgba(11,11,10,0.2)]">
        {children}
      </div>
    </div>
  );
}

function PanelHeader({ children, status }: { children: ReactNode; status: ReactNode }) {
  return (
    <div className="flex h-[46px] flex-none items-center gap-2 border-b border-black/10 px-[18px] text-[13px] font-medium">
      {children}
      <span className="ml-auto flex items-center gap-1.5 pr-9 font-mono text-[9.5px] tracking-[0.05em] text-black/40 uppercase">
        {status}
      </span>
    </div>
  );
}

function Dot({ tone = 'good' }: { tone?: 'good' | 'warn' | 'check' }) {
  const color =
    tone === 'good' ? 'bg-[var(--chart-up)]' : tone === 'warn' ? 'bg-primary' : 'animate-pulse bg-black/40';
  return <span className={`size-1.5 flex-none rounded-full ${color}`} />;
}

function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-[#efeee9] px-2 py-[3px] text-[10px] font-medium whitespace-nowrap text-black/55 ${className}`}
    >
      {children}
    </span>
  );
}

function AssetsMockup() {
  const [active, setActive] = useState(0);

  return (
    <Tile>
      <PanelHeader
        status={
          <>
            <Dot />3 approved
          </>
        }
      >
        Brand assets
      </PanelHeader>
      <div className="flex-1 overflow-hidden pt-1.5">
        {assets.map((asset, index) => (
          <button
            aria-pressed={active === index}
            className={`relative grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-black/10 px-[18px] py-[11px] text-left transition-colors hover:bg-[#f6f6f2] ${
              active === index ? 'bg-[#f6f6f2]' : ''
            }`}
            key={asset.name}
            onClick={() => setActive(index)}
            type="button"
          >
            {active === index ? (
              <span className="absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-full bg-primary" />
            ) : null}
            <span
              className="grid size-10 place-items-center overflow-hidden rounded-[10px] border border-black/10 bg-[#f8f3ec] font-semibold tracking-[-0.06em] text-black"
              style={{ fontSize: asset.size }}
            >
              {asset.mark}
            </span>
            <span>
              <span className="block text-[13px] font-medium">{asset.name}</span>
              <span className="mt-0.5 block text-[11px] text-black/50">{asset.meta}</span>
            </span>
            <span className="flex items-center gap-1 pr-10 text-[10px] font-medium text-[var(--chart-up)]">
              <svg aria-hidden className="size-[11px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 12 12">
                <path d="M2.5 6.5l2.3 2.2L9.5 3.5" />
              </svg>
              Approved
            </span>
          </button>
        ))}
        <div className="grid gap-3 px-[18px] py-4">
          <p className="font-mono text-[9px] tracking-[0.11em] text-black/38 uppercase">Palette</p>
          <div className="flex gap-[7px]">
            {palette.map((hex) => (
              <span
                className="group/sw relative size-8 rounded-[9px] border border-black/10 transition-transform hover:-translate-y-[3px]"
                key={hex}
                style={{ background: hex }}
              >
                <span className="pointer-events-none absolute -top-[26px] left-1/2 -translate-x-1/2 scale-90 rounded-[5px] bg-black px-1.5 py-[3px] font-mono text-[9px] whitespace-nowrap text-white opacity-0 transition group-hover/sw:scale-100 group-hover/sw:opacity-100">
                  {hex}
                </span>
              </span>
            ))}
          </div>
          <p className="font-mono text-[9px] tracking-[0.11em] text-black/38 uppercase">Used on</p>
          <div className="flex gap-1.5" key={active}>
            {assets[active].usedOn.map((place) => (
              <Chip className="ownlane-pop" key={place}>
                <Dot />
                {place}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </Tile>
  );
}

function AudienceMockup() {
  const [feed, setFeed] = useState({ count: 286, next: 3, items: [2, 1, 0], fresh: false });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFeed((current) => ({
        count: current.count + 1,
        next: current.next + 1,
        items: [current.next % leads.length, ...current.items].slice(0, 4),
        fresh: true,
      }));
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Tile>
      <PanelHeader
        status={
          <>
            <Dot />
            Live
          </>
        }
      >
        <span className="font-normal text-black/38">#</span>audience
      </PanelHeader>
      <div className="flex items-end justify-between border-b border-black/10 px-[18px] pt-4 pb-3.5">
        <div>
          <p className="text-[38px] leading-none font-semibold tracking-[-0.06em] tabular-nums">{feed.count}</p>
          <p className="mt-1.5 text-[11px] text-black/50">contacts and inquiries</p>
        </div>
        <span className="pr-10 pb-[3px] text-[11px] font-medium text-[var(--chart-up)] tabular-nums">
          +{12 + feed.count - 286} this week
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        {feed.items.map((leadIndex, position) => {
          const lead = leads[leadIndex];
          return (
            <div
              className={`grid grid-cols-[32px_1fr] gap-[11px] border-b border-black/10 bg-white px-[18px] py-3 ${
                position === 0 && feed.fresh ? 'ownlane-lead-in' : ''
              }`}
              key={`${feed.count - position}-${leadIndex}`}
            >
              <span className="grid size-8 place-items-center rounded-full bg-[#efeee9] font-mono text-[9.5px] font-medium">
                {lead.initials}
              </span>
              <div>
                <p className="flex items-center gap-2 text-[13px] font-medium">
                  {lead.name}
                  <time className="font-mono text-[10px] font-normal text-black/38">{lead.time}</time>
                </p>
                <p className="mt-[3px] pr-10 text-[12.5px] leading-[1.45] text-black/55">{lead.message}</p>
                <Chip className="mt-[7px]">via {lead.source}</Chip>
              </div>
            </div>
          );
        })}
      </div>
    </Tile>
  );
}

function LinksMockup() {
  const [states, setStates] = useState<LinkState[]>(['check', 'check', 'check']);
  const [fixed, setFixed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [scanId, setScanId] = useState(0);
  const timers = useRef<number[]>([]);

  const schedule = useCallback((resolved: boolean) => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [0, 1, 2].map((index) =>
      window.setTimeout(
        () =>
          setStates((current) =>
            current.map((state, i) =>
              i <= index ? (destinations[i].ok || resolved ? 'ok' : 'bad') : state,
            ),
          ),
        2000 * (0.3 + index * 0.28),
      ),
    );
  }, []);

  const runScan = useCallback(
    (resolved: boolean) => {
      setStates(['check', 'check', 'check']);
      setScanId((id) => id + 1);
      schedule(resolved);
    },
    [schedule],
  );

  useEffect(() => {
    schedule(false);
    return () => timers.current.forEach(window.clearTimeout);
  }, [schedule]);

  useEffect(() => {
    if (!fixed) return;
    const timer = window.setTimeout(() => {
      setFixed(false);
      runScan(false);
    }, 14000);
    return () => window.clearTimeout(timer);
  }, [fixed, runScan]);

  const settled = states.every((state) => state !== 'check');
  const broken = states.includes('bad');

  const applyFix = () => {
    setUpdating(true);
    timers.current.push(
      window.setTimeout(() => {
        setUpdating(false);
        setFixed(true);
        runScan(true);
      }, 700),
    );
  };

  return (
    <Tile>
      <PanelHeader
        status={
          <>
            <Dot tone={!settled ? 'check' : broken ? 'warn' : 'good'} />
            {!settled ? 'Checking' : broken ? '1 to review' : 'All healthy'}
          </>
        }
      >
        Destinations
      </PanelHeader>
      <div className="relative flex-1 overflow-hidden">
        {destinations.map((destination, index) => {
          const state = states[index];
          return (
            <div
              className="grid grid-cols-[1fr_auto] items-center gap-2.5 border-b border-black/10 px-[18px] py-[13px]"
              key={destination.title}
            >
              <div>
                <p className="text-[13px] font-medium">{destination.title}</p>
                <p className="mt-1 flex items-center gap-[7px] font-mono text-[10.5px] whitespace-nowrap text-black/50">
                  {index === 2 && fixed ? 'studio.example/autumn' : destination.url}
                  <span className="rounded-[5px] bg-[#efeee9] px-1.5 py-0.5 text-[9px] font-medium">
                    {destination.tag}
                  </span>
                </p>
              </div>
              <span className="flex items-center gap-1.5 pr-10 text-[11px] whitespace-nowrap text-black/50">
                <Dot tone={state === 'check' ? 'check' : state === 'bad' ? 'warn' : 'good'} />
                {state === 'check' ? 'Checking' : state === 'ok' ? 'Healthy' : '404'}
              </span>
            </div>
          );
        })}
        <div
          className="ownlane-scan pointer-events-none absolute inset-x-0 top-[-44px] h-10 border-b border-primary/50 bg-gradient-to-b from-transparent via-primary/[0.13] to-transparent"
          key={scanId}
        />
        {settled && broken ? (
          <div className="ownlane-lead-in mx-[18px] mt-3.5 grid gap-[9px] rounded-[11px] border border-primary/40 bg-primary/[0.07] p-3 text-[12px]">
            <p>Autumn launch returns 404 on 2 profiles.</p>
            <p className="font-mono text-[10.5px] whitespace-nowrap text-black/50">
              <s className="text-primary">studio.example/launch</s> →{' '}
              <b className="font-medium text-[var(--chart-up)]">/autumn</b>
            </p>
            <button
              className="justify-self-start rounded-lg bg-black px-3 py-[7px] text-[11px] font-medium text-white transition-transform hover:-translate-y-px"
              onClick={applyFix}
              type="button"
            >
              {updating ? 'Updating…' : 'Update in 2 places'}
            </button>
          </div>
        ) : null}
      </div>
    </Tile>
  );
}

const features = [
  {
    mockup: <AssetsMockup />,
    title: 'Asset management',
    body: 'Keep the approved logo, avatar and palette in one place, and see exactly which profiles use each version.',
  },
  {
    mockup: <AudienceMockup />,
    title: 'Audience tracking',
    body: 'Follow real people, not just views. Every inquiry is tied to the link or platform that brought them in.',
  },
  {
    mockup: <LinksMockup />,
    title: 'Links & campaigns',
    body: 'Check every destination and catch broken links before your audience does. Fix them everywhere in one step.',
  },
];

export function CapabilityGallery() {
  return (
    <section className="bg-[#f3f3ef]" id="capabilities">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1200px] py-20 lg:py-24">
        <div className="grid items-end gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="font-mono text-[9px] tracking-[0.13em] text-black/42 uppercase">
              Beyond profile sync
            </p>
            <h2 className="mt-5 max-w-[16ch] text-[clamp(2rem,3.3vw,3rem)] leading-[0.99] font-semibold tracking-[-0.055em] text-balance">
              Your identity includes where people go next.
            </h2>
          </div>
          <p className="max-w-[47ch] text-[15px] leading-[1.72] text-black/50 lg:pb-1">
            Keep the links, work, assets, audience, and signals around your identity close enough to
            manage as one system.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-12 md:grid-cols-3">
          {features.map((feature) => (
            <div className="min-w-0" key={feature.title}>
              {feature.mockup}
              <h3 className="mt-7 text-[21px] leading-[1.15] font-semibold tracking-[-0.04em]">
                {feature.title}
              </h3>
              <p className="mt-2.5 max-w-[38ch] text-[14.5px] leading-[1.65] text-black/55">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
