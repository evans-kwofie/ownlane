import Link from 'next/link';
import { OwnlaneMark } from '@ownlane/ui/components/ownlane-mark';
import { FinalCta } from '@/components/final-cta';

const questions = [
  {
    question: 'Does Ownlane replace my website?',
    answer: 'No. Use it alongside the site and platforms you already have. Ownlane keeps the identity, links, and public details behind them organised and comparable.',
  },
  {
    question: 'Can Ownlane update every platform automatically?',
    answer: 'No platform permits every field to be written by another service. Ownlane updates permitted fields, reads back what it can verify, and gives you an exact guided step when direct access is unavailable.',
  },
  {
    question: 'What happens when a platform blocks profile updates?',
    answer: 'You see the difference, the exact replacement value, and where to make the change. Ownlane records completion instead of pretending the update happened automatically.',
  },
  {
    question: 'Do I give Ownlane my platform passwords?',
    answer: 'No. Supported accounts connect through the platform’s authorization flow. Access can be revoked from Ownlane or the provider.',
  },
  {
    question: 'Can I manage more than one identity or brand?',
    answer: 'Yes. Each workspace keeps its own profile, links, assets, connections, content, audience, and analytics separate.',
  },
  {
    question: 'What does Ownlane monitor after setup?',
    answer: 'Depending on the connected destination, Ownlane can surface mismatched public fields, stale links, connection problems, and other identity-health issues that need attention.',
  },
];

export function LandingClose() {
  return (
    <>
      <section className="bg-background" id="faq">
        <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1200px] gap-14 py-20 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:py-24">
          <div>
            <p className="font-mono text-[9px] tracking-[0.13em] text-primary uppercase">Before you start</p>
            <h2 className="mt-5 max-w-[13ch] text-[clamp(2rem,3.3vw,3rem)] leading-[1] font-semibold tracking-[-0.055em] text-balance">
              Questions, answered plainly.
            </h2>
          </div>

          <div className="border-t border-black/18">
            {questions.map((item, index) => (
              <details className="group border-b border-black/15" key={item.question}>
                <summary className="grid cursor-pointer list-none grid-cols-[28px_1fr_auto] items-center gap-3 py-5 [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-[8px] text-black/30">0{index + 1}</span>
                  <span className="text-[13px] font-semibold">{item.question}</span>
                  <span className="text-[18px] font-light text-black/45 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-[62ch] pr-8 pb-5 pl-10 text-[12.5px] leading-[1.7] text-black/50">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-[#f3f3ef]" id="get-started">
        <FinalCta />
      </section>

      <footer className="bg-black text-white">
        <div className="mx-auto w-[calc(100%-2rem)] max-w-[1200px] pt-14 pb-8">
          <div className="grid gap-12 border-b border-white/15 pb-14 sm:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <Link className="inline-flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.025em]" href="/">
                <OwnlaneMark className="size-5 text-primary" variant="open" />
                Ownlane
              </Link>
              <p className="mt-5 max-w-[29ch] text-[12px] leading-[1.65] text-white/42">
                One profile. Every platform. Always current.
              </p>
            </div>

            <div>
              <p className="font-mono text-[8px] tracking-[0.12em] text-white/30 uppercase">Explore</p>
              <div className="mt-5 flex flex-col gap-3 text-[11.5px] text-white/60">
                <Link className="hover:text-white" href="/#fragmentation">The problem</Link>
                <Link className="hover:text-white" href="/#how-it-works">How it works</Link>
                <Link className="hover:text-white" href="/#capabilities">Capabilities</Link>
                <Link className="hover:text-white" href="/#faq">FAQ</Link>
              </div>
            </div>

            <div>
              <p className="font-mono text-[8px] tracking-[0.12em] text-white/30 uppercase">Account</p>
              <div className="mt-5 flex flex-col gap-3 text-[11.5px] text-white/60">
                <Link className="hover:text-white" href="/api/start">Get started</Link>
                <Link className="hover:text-white" href="/api/start">Log in</Link>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-7 text-[9.5px] text-white/32">
            <span>Ownlane © {new Date().getFullYear()}</span>
            <span>One canonical identity, controlled everywhere it can be.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
