import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ScrollReadingText } from "@/components/scroll-reading-text";

export const metadata: Metadata = {
  title: "Why Ownlane",
  description: "Ownlane gives creators one branded home for products, services, memberships, support, and the audience behind their business.",
  alternates: { canonical: "/why-ownlane" },
};

const oldStack = ["Link page", "Product shop", "Booking tool", "Membership platform", "Tips and gifts", "Email and customer data"];
const outcomes = [
  ["01", "One brand, all the way through", "Your audience arrives in your world and stays there, instead of stepping through a row of disconnected tools."],
  ["02", "Every way you earn, together", "Products, sessions, memberships, tips, and supporter campaigns live in one storefront and one checkout experience."],
  ["03", "One relationship, not scattered transactions", "A buyer, member, supporter, and booking client can be understood as the same person, with one consent-aware audience record."],
  ["04", "A business you can actually see", "Revenue, offers, customers, support, and conversion belong in one clear view, not six tabs and a spreadsheet."],
];

export default function WhyOwnlanePage() {
  return (
    <main className="bg-white text-black">
      <SiteHeader />

      <section className="mx-auto max-w-[1440px] border-y border-black">
        <div className="grid min-h-[650px] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-between border-b border-black px-5 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ff4d00]">WHY OWNLANE</p>
            <div><h1 className="max-w-xl text-[clamp(4.6rem,9vw,8.8rem)] font-black leading-[0.76] tracking-[-0.1em]">YOUR CREATOR<br />BUSINESS IS SPREAD<br />ACROSS TOO MANY <span className="text-[#ff4d00]">TOOLS.</span></h1><p className="mt-10 max-w-md text-lg leading-7 text-black/65">A creator business is not one link, one product, or one revenue stream. It is the whole relationship between what you make and the people who want to support it.</p></div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">One home. Every way you earn.</p>
          </div>
          <div className="relative min-h-[420px] overflow-hidden bg-black"><Image src="/images/creator-strip.png" alt="Independent creators building their businesses" fill className="object-cover grayscale" sizes="(max-width: 1024px) 100vw, 720px" /><div className="absolute inset-x-0 top-[14%] border-y border-black bg-[#ff4d00] py-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-black">You are more than your latest link</div><div className="absolute inset-x-0 bottom-[10%] border-y border-white bg-black px-5 py-5 text-center text-xl font-black uppercase tracking-[-0.05em] text-white sm:text-3xl">Your business should move as one.</div></div>
        </div>
      </section>

      <section className="overflow-hidden bg-black py-5 text-white"><div className="marquee-track flex w-max text-xs font-bold uppercase tracking-[0.13em]"><div className="flex gap-12 pr-12 sm:gap-16 sm:pr-16"><span>One brand</span><span>One audience</span><span>One checkout</span><span>One business view</span><span>One brand</span><span>One audience</span><span>One checkout</span><span>One business view</span></div><div aria-hidden="true" className="flex gap-12 pr-12 sm:gap-16 sm:pr-16"><span>One brand</span><span>One audience</span><span>One checkout</span><span>One business view</span><span>One brand</span><span>One audience</span><span>One checkout</span><span>One business view</span></div></div></section>

      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-0 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-0"><div className="lg:px-12 lg:pr-20"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ff4d00]">THE REAL ALTERNATIVE</p><h2 className="mt-5 max-w-md text-5xl font-black leading-[0.83] tracking-[-0.08em] sm:text-6xl">A business held together with links.</h2></div><div className="border-t border-black">{oldStack.map((tool, index) => <div className="flex items-center justify-between border-b border-black py-5" key={tool}><span className="font-mono text-xs text-[#ff4d00]">0{index + 1}</span><span className="w-[78%] text-2xl font-black tracking-[-0.05em] sm:text-3xl">{tool}</span><span className="text-sm text-black/45">Separate</span></div>)}</div></div>
        <ScrollReadingText>That stack can get you started. But as more people buy, book, join, and support you, every handoff costs attention. Ownlane exists to make your business feel whole again.</ScrollReadingText>
      </section>

      <section id="difference" className="border-y border-black bg-black text-white"><div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-0 lg:py-28"><div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-0"><div className="lg:px-12 lg:pr-20"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ff4d00]">WHAT CHANGES WITH OWNLANE</p><h2 className="mt-5 max-w-md text-5xl font-black leading-[0.83] tracking-[-0.08em] sm:text-6xl">Your work stops living in fragments.</h2></div><div className="border-t border-white/40">{outcomes.map(([number, title, detail]) => <article className="grid grid-cols-[44px_1fr] gap-4 border-b border-white/40 py-7 sm:grid-cols-[64px_1fr] sm:gap-7" key={number}><span className="pt-1 font-mono text-xs text-[#ff4d00]">{number}</span><div><h3 className="text-3xl font-black tracking-[-0.06em]">{title}</h3><p className="mt-3 max-w-lg text-lg leading-7 text-white/65">{detail}</p></div></article>)}</div></div></div></section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 text-center sm:px-8 lg:py-32"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ff4d00]">CLAIM YOUR BUSINESS HOME</p><h2 className="mx-auto mt-7 max-w-5xl text-[clamp(4.5rem,12vw,11rem)] font-black leading-[0.72] tracking-[-0.11em]">MAKE YOUR<br /><span className="text-[#ff4d00]">MOVE.</span></h2><p className="mx-auto mt-10 max-w-xl text-lg leading-7 text-black/65">Ownlane is being built with creators who are ready to bring their products, services, support, and audience into one branded home.</p><Link className="button-pour mt-9 inline-flex bg-[#ff4d00] px-7 py-4 text-sm font-bold uppercase tracking-[0.1em] text-black [--button-fill:#000000] hover:text-white" href="/#early-access"><span>Join the first wave</span></Link></section>

      <footer className="overflow-hidden border-t border-black pt-5"><div className="mx-auto flex max-w-[1440px] justify-between px-5 text-[10px] font-bold uppercase tracking-[0.12em] sm:px-8"><span>Ownlane © {new Date().getFullYear()}</span><span>Built for creators with a business to grow</span></div><p className="-mb-[0.15em] mt-4 whitespace-nowrap text-center text-[24vw] font-black leading-none tracking-[-0.12em]">OWNLANE</p></footer>
    </main>
  );
}
