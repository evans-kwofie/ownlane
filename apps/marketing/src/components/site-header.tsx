"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OwnlaneMark } from "@/components/ownlane-mark";

const navigation = [
  { href: "/why-ownlane", label: "Why Ownlane" },
  { href: "/for-creators", label: "For creators" },
  { href: "/#what", label: "What you can do" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 mx-auto max-w-[1440px] bg-white text-black">
      <nav className={menuOpen ? "relative z-50 flex items-center justify-between bg-black px-5 py-5 text-white sm:px-8 md:bg-white md:text-black" : "relative z-50 flex items-center justify-between px-5 py-5 sm:px-8"} aria-label="Main navigation">
        <Link aria-label="Ownlane home" className="flex items-center gap-2 text-xl font-black tracking-[-0.08em]" href="/"><OwnlaneMark variant="open" className="h-6 w-6 text-[#ff4d00]" /><span>OWNLANE</span></Link>
        <div className="hidden items-center gap-8 md:flex">{navigation.map((item) => <Link className="text-xs font-bold uppercase tracking-[0.12em]" href={item.href} key={item.href}>{item.label}</Link>)}<Link className="border border-black px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:bg-black hover:text-white" href="/#early-access">Join early</Link></div>
        <button aria-controls="mobile-navigation" aria-expanded={menuOpen} className={menuOpen ? "border border-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] md:hidden" : "border border-black px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] md:hidden"} onClick={() => setMenuOpen(!menuOpen)} type="button">{menuOpen ? "Close" : "Menu"}</button>
      </nav>
      {menuOpen ? <div className="fixed inset-0 z-40 flex min-h-dvh bg-black px-5 text-white sm:px-8 md:hidden" id="mobile-navigation"><div className="mx-auto flex w-full max-w-[1440px] flex-col pt-28"><div className="border-t border-white/40">{navigation.map((item, index) => <Link className="mobile-menu-item block border-b border-white/40 py-6 text-4xl font-black leading-none tracking-[-0.07em]" href={item.href} key={item.href} onClick={() => setMenuOpen(false)} style={{ animationDelay: String(index * 90 + 90) + "ms" }}>{item.label}</Link>)}</div><div className="mobile-menu-item mt-auto pb-10" style={{ animationDelay: "390ms" }}><Link className="button-pour flex justify-center bg-[#ff4d00] px-5 py-5 text-sm font-bold uppercase tracking-[0.1em] text-black [--button-fill:#ffffff]" href="/#early-access" onClick={() => setMenuOpen(false)}><span>Join early</span></Link></div></div></div> : null}
    </header>
  );
}
