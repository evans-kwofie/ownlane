import Image from 'next/image';
import { ScrollReadingText } from '@/components/scroll-reading-text';

const products = [
  ['Products', 'Guides, downloads, prompts, templates, code, and original work.'],
  ['Services', 'Bookings, consultations, freelance work, and paid access to your time.'],
  ['Support', 'Tips, gifts, memberships, campaigns, and the people rooting for you.'],
];

const creatorTypes = [
  'Artists',
  'Musicians',
  'Writers',
  'Designers',
  'Developers',
  'Indie hackers',
  'Vibe coders',
  'Prompt engineers',
  'Educators',
  'Consultants',
  'Streamers',
  'Community builders',
];

export default function Home() {
  return (
    <main className="bg-white text-black">
      <nav className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8">
        <a className="text-xl font-black tracking-[-0.08em]" href="#top">OWNLANE</a>
        <div className="hidden gap-8 text-xs font-bold uppercase tracking-[0.12em] md:flex"><a href="#why">Why Ownlane</a><a href="#what">What you can do</a></div>
        <a className="border border-black px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:bg-black hover:text-white" href="#early-access">Join early</a>
      </nav>

      <section id="top" className="mx-auto max-w-[1440px] border-t border-black">
        <div className="flex min-h-[640px] flex-col items-center justify-between px-5 py-7 text-center sm:px-8 lg:px-12">
          <p className="reveal text-xs font-bold uppercase tracking-[0.15em] text-[#ff4d00]">Your brand. Your audience. Your business.</p>
          <div className="flex flex-col items-center py-16"><h1 className="reveal reveal-delay-1 max-w-5xl text-[clamp(4.4rem,10vw,9.4rem)] font-black leading-[0.78] tracking-[-0.1em]">THE HOME FOR<br />WHAT YOU <span className="text-[#ff4d00]">MAKE.</span></h1><p className="reveal reveal-delay-2 mt-10 max-w-xl text-lg leading-7 text-black/65 sm:text-xl">Ownlane brings the scattered parts of your creator business together: your work, your offers, your people, and every way they can support what you&apos;re building.</p><a className="button-pour reveal reveal-delay-3 mt-8 inline-flex bg-black px-5 py-4 text-sm font-bold uppercase tracking-[0.09em] text-white [--button-fill:#ff4d00]" href="#early-access"><span>Be part of the first wave</span></a></div>
          <div className="flex w-full self-stretch items-end justify-between border-t border-black pt-4"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">One link. Every way to move.</p><p className="hidden max-w-xs text-right text-xs font-bold uppercase tracking-[0.12em] text-black/65 sm:block">For creators who are done renting space online.</p></div>
        </div>
      </section>

      <section className="overflow-hidden bg-black py-5 text-white"><div className="marquee-track flex w-max text-xs font-bold uppercase tracking-[0.13em]">{[0, 1, 2, 3].map((copy) => <div className="flex gap-12 pr-12 sm:gap-16 sm:pr-16" aria-hidden={copy > 0 || undefined} key={copy}>{creatorTypes.map((creator) => <span key={creator}>{creator}</span>)}</div>)}</div></section>

      <section id="why" className="mx-auto max-w-[1440px] border-x border-black">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]"><div className="flex flex-col justify-between border-b border-black px-5 py-12 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-16"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ff4d00]">THE PROBLEM ISN&apos;T YOUR AMBITION</p><h2 className="mt-20 max-w-xl text-5xl font-black leading-[0.83] tracking-[-0.08em] sm:text-7xl">Your business is spread too thin.</h2><p className="mt-10 max-w-md text-lg leading-7 text-black/65">A link page in one place. A shop in another. Bookings, tips, gifting, and memberships somewhere else. Every jump is friction for the people already ready to support you.</p></div>
          <div className="relative min-h-[500px] overflow-hidden bg-black"><Image src="/images/creator-strip.png" alt="Independent creators in their workspaces" fill className="object-cover grayscale" sizes="(max-width: 1440px) 100vw, 720px" /><div className="absolute inset-x-0 top-[13%] border-y border-black bg-[#ff4d00] py-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-black">Your identity is not a button list</div><div className="absolute inset-x-0 bottom-[9%] border-y border-white bg-black px-5 py-5 text-center text-xl font-black uppercase tracking-[-0.05em] text-white sm:text-3xl">One home changes the whole relationship.</div></div>
        </div>
      </section>

      <section id="what" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-0 lg:py-24"><div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-0"><div className="lg:px-12 lg:pr-20"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ff4d00]">THE ONE-STOP BUSINESS HOME</p><h2 className="mt-5 max-w-md text-5xl font-black leading-[0.83] tracking-[-0.08em] sm:text-6xl">Let your audience show up their way.</h2></div><div className="border-t border-black">{products.map(([name, detail], index) => <article className="grid grid-cols-[44px_1fr] items-start gap-4 border-b border-black py-6 sm:grid-cols-[64px_1fr] sm:gap-7" key={name}><span className="pt-1 font-mono text-xs text-[#ff4d00]">0{index + 1}</span><div><h3 className="text-3xl font-black tracking-[-0.06em]">{name}</h3><p className="mt-2 max-w-lg text-lg leading-7 text-black/65">{detail}</p></div></article>)}</div></div>
        <ScrollReadingText>Whether someone wants to buy a workflow, book an hour, join your world, or simply send appreciation, they should never have to leave your brand to do it.</ScrollReadingText>
      </section>

      <section className="border-y border-black bg-black text-white"><div className="mx-auto grid max-w-[1440px] lg:grid-cols-[0.9fr_1.1fr]"><div className="px-5 py-16 sm:px-8 lg:px-12"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ff4d00]">A BETTER DEAL FOR CREATORS</p><p className="mt-20 max-w-md text-5xl font-black leading-[0.82] tracking-[-0.08em] sm:text-7xl">Keep what you earn.</p></div><div className="flex items-end border-t border-white/30 px-5 py-16 sm:px-8 lg:border-l lg:border-t-0 lg:px-12"><p className="max-w-lg text-xl leading-8 text-white/70">No Ownlane commission on your sale, gift, tip, or booking. We&apos;re building a subscription-led platform because your momentum should belong to you.</p></div></div></section>

      <section id="early-access" className="mx-auto max-w-[1440px] px-5 py-24 text-center sm:px-8 lg:py-32"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ff4d00]">THE FIRST ONES SET THE TONE</p><h2 className="mx-auto mt-7 max-w-5xl text-[clamp(4.5rem,12vw,11rem)] font-black leading-[0.72] tracking-[-0.11em]">MAKE YOUR<br /><span className="text-[#ff4d00]">MOVE.</span></h2><p className="mx-auto mt-10 max-w-lg text-lg leading-7 text-black/65">We&apos;re building Ownlane with the people shaping what independent work looks like next. If that&apos;s you, come early.</p><a className="button-pour mt-9 inline-flex bg-[#ff4d00] px-7 py-4 text-sm font-bold uppercase tracking-[0.1em] text-black [--button-fill:#000000] hover:text-white" href="mailto:hello@useownlane.com?subject=Ownlane%20early%20access"><span>I&apos;m claiming my lane</span></a></section>

      <footer className="overflow-hidden border-t border-black pt-5"><div className="mx-auto flex max-w-[1440px] justify-between px-5 text-[10px] font-bold uppercase tracking-[0.12em] sm:px-8"><span>Ownlane © {new Date().getFullYear()}</span><span>Built for the independent</span></div><p className="-mb-[0.15em] mt-4 whitespace-nowrap text-center text-[24vw] font-black leading-none tracking-[-0.12em]">OWNLANE</p></footer>
    </main>
  );
}
