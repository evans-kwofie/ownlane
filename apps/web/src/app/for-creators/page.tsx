import type { Metadata } from "next";
import Link from "next/link";
import { CreatorIndex } from "@/components/creator-index";
import { SiteHeader } from "@/components/site-header";
import { ScrollReadingText } from "@/components/scroll-reading-text";

export const metadata: Metadata = {
  title: "Built for creators",
  description: "See how Ownlane helps photographers, content creators, educators, consultants, artists, and community builders bring every way they earn into one branded home.",
  alternates: { canonical: "/for-creators" },
};

export default function ForCreatorsPage() {
  return <main className="bg-white text-black">
    <SiteHeader />
    <section className="mx-auto max-w-[1440px] border-y border-black"><div className="flex min-h-[560px] flex-col items-center justify-between px-5 py-8 text-center sm:px-8 lg:px-12"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ff4d00]">BUILT FOR THE WAY YOU WORK</p><div className="py-14"><h1 className="max-w-5xl text-[clamp(4.4rem,10vw,9.2rem)] font-black leading-[0.78] tracking-[-0.1em]">ONE BUSINESS HOME.<br />MANY WAYS TO <span className="text-[#ff4d00]">EARN.</span></h1><p className="mx-auto mt-10 max-w-2xl text-lg leading-7 text-black/65 sm:text-xl">Ownlane is for creators turning their work, expertise, or community into a business. Find your lane and see what one home can hold.</p></div><div className="w-full border-t border-black pt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Built for a real creator business, not just a profile</div></div></section>
    <CreatorIndex />
    <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-0 lg:py-28"><ScrollReadingText>The medium is different. The need is the same: one branded place where the people who find your work can understand it, support it, and stay connected to what comes next.</ScrollReadingText></section>
    <section className="border-y border-black bg-black text-white"><div className="mx-auto max-w-[1440px] px-5 py-24 text-center sm:px-8 lg:py-32"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ff4d00]">ONE PLACE. EVERY WAY YOU EARN.</p><h2 className="mx-auto mt-7 max-w-5xl text-[clamp(4.5rem,12vw,11rem)] font-black leading-[0.72] tracking-[-0.11em]">ONE PLACE TO<br />SELL, BOOK, AND <span className="text-[#ff4d00]">GROW.</span></h2><p className="mx-auto mt-10 max-w-xl text-lg leading-7 text-white/70">Ownlane brings your products, services, support, and audience into one branded home.</p><Link className="button-pour mt-9 inline-flex bg-[#ff4d00] px-7 py-4 text-sm font-bold uppercase tracking-[0.1em] text-black [--button-fill:#ffffff] hover:text-black" href="/#early-access"><span>Join the first wave</span></Link></div></section>
    <footer className="overflow-hidden border-t border-black pt-5"><div className="mx-auto flex max-w-[1440px] justify-between px-5 text-[10px] font-bold uppercase tracking-[0.12em] sm:px-8"><span>Ownlane © {new Date().getFullYear()}</span><span>Built for creators with a business to grow</span></div><p className="-mb-[0.15em] mt-4 whitespace-nowrap text-center text-[24vw] font-black leading-none tracking-[-0.12em]">OWNLANE</p></footer>
  </main>;
}
