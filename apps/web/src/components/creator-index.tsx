"use client";

import Image from "next/image";
import { useState } from "react";

const creatorStories = [
  {
    name: "Photographers",
    label: "YOUR WORK, YOUR CLIENTS, ONE FRONT DOOR",
    headline: "More than a portfolio. A place to book, buy, and come back to.",
    offers: ["Photo sessions", "Presets and photo packs", "Prints and licensing"],
    detail: "Let someone admire your work, book a shoot, buy a preset pack, or join your list without bouncing between a portfolio, calendar, and separate shop.",
  },
  {
    name: "Content creators",
    label: "TURN YOUR BIO LINK INTO A BUSINESS HOME",
    headline: "Give every follower a next step that belongs to you.",
    offers: ["Guides and digital products", "Brand and UGC packages", "Support and memberships"],
    detail: "Put the products, services, and ways to support your work behind one branded link instead of sending people into a maze of profile tools.",
  },
  {
    name: "Educators",
    label: "MAKE YOUR KNOWLEDGE EASIER TO BUY",
    headline: "Teach, sell, and grow the relationship in the same place.",
    offers: ["Courses and guides", "Templates and toolkits", "Workshops and memberships"],
    detail: "Bring practical resources, paid learning, live sessions, and future offers together so every learner can find the right next step.",
  },
  {
    name: "Coaches + consultants",
    label: "PACKAGE YOUR EXPERTISE WITHOUT LOSING THE HUMAN PART",
    headline: "Let a small offer lead naturally to your best work.",
    offers: ["Strategy sessions", "Productized services", "Resources and workshops"],
    detail: "Sell an audit, let someone book time, and offer useful resources from one home that makes your expertise feel coherent and easy to act on.",
  },
  {
    name: "Artists + designers",
    label: "LET SUPPORTERS SEE THE WHOLE OF YOUR PRACTICE",
    headline: "Your creative world should not be split between six platforms.",
    offers: ["Commissions and services", "Prints and downloads", "Tips and memberships"],
    detail: "Give people one place to commission you, buy your work, support your practice, and discover what you are making next.",
  },
  {
    name: "Community builders",
    label: "MAKE JOINING FEEL LIKE JOINING SOMETHING REAL",
    headline: "A clear path from curious visitor to committed member.",
    offers: ["Memberships", "Events and workshops", "Community resources"],
    detail: "Put joining, attending, supporting, and discovering your community in one clear experience instead of asking people to decode a stack of tools.",
  },
];

export function CreatorIndex() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <section className="mx-auto max-w-[1440px] border-x border-black" aria-labelledby="creator-index-title">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-black px-5 py-12 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ff4d00]">MADE FOR THE WAY YOU WORK</p>
          <h2 id="creator-index-title" className="mt-5 max-w-md text-5xl font-black leading-[0.83] tracking-[-0.08em] sm:text-6xl">One business home. Many ways to earn.</h2>
          <p className="mt-8 max-w-md text-lg leading-7 text-black/65">Choose your lane to see how Ownlane brings the work you make and the ways people support it into one place.</p>
          <div className="mt-12 border-t border-black" role="tablist" aria-label="Creator types">
            {creatorStories.map((story, index) => {
              const selected = index === selectedIndex;
              return <button aria-controls={`creator-panel-${index}`} aria-selected={selected} className={selected ? "flex w-full items-center justify-between border-b border-black bg-[#ff4d00] px-4 py-4 text-left text-xl font-black tracking-[-0.05em]" : "flex w-full items-center justify-between border-b border-black px-4 py-4 text-left text-xl font-black tracking-[-0.05em] transition-colors hover:bg-black hover:text-white"} id={`creator-tab-${index}`} key={story.name} onClick={() => setSelectedIndex(index)} role="tab" type="button"><span>{story.name}</span><span className="font-mono text-xs">0{index + 1}</span></button>;
            })}
          </div>
        </div>
        <div className="bg-black text-white">
          {creatorStories.map((story, index) => <div aria-labelledby={`creator-tab-${index}`} hidden={index !== selectedIndex} id={`creator-panel-${index}`} key={story.name} role="tabpanel">
            <div className="relative min-h-[310px] overflow-hidden border-b border-white/40"><Image alt="Creator at work" fill className="object-cover grayscale opacity-70" sizes="(max-width: 1024px) 100vw, 720px" src="/images/creator-strip.png" /><div className="absolute inset-x-0 top-[14%] border-y border-black bg-[#ff4d00] px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-black">{story.label}</div></div>
            <div className="px-5 py-10 sm:px-8 lg:px-12 lg:py-12"><h3 className="max-w-xl text-4xl font-black leading-[0.86] tracking-[-0.07em] sm:text-5xl">{story.headline}</h3><p className="mt-7 max-w-xl text-lg leading-7 text-white/70">{story.detail}</p><div className="mt-10 flex flex-wrap gap-2">{story.offers.map((offer) => <span className="border border-white/40 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em]" key={offer}>{offer}</span>)}</div></div>
          </div>)}
        </div>
      </div>
    </section>
  );
}
