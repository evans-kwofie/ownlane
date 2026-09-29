const trustPoints = [
  ['OAuth connections', 'Connect through the platform rather than handing Ownlane your password.'],
  ['Minimum access', 'Ask only for the permissions needed for the capability you choose.'],
  ['Visible changes', 'See the difference and destination before an outward update is made.'],
  ['A clean exit', 'Disconnect accounts and retain control of the identity and platforms you own.'],
];

export function TrustSection() {
  return (
    <section className="bg-black text-white" id="trust">
      <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1200px] gap-14 py-20 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 lg:py-24">
        <div>
          <p className="font-mono text-[9px] tracking-[0.13em] text-primary uppercase">Control stays with you</p>
          <h2 className="mt-5 max-w-[13ch] text-[clamp(2rem,3.3vw,3rem)] leading-[0.98] font-semibold tracking-[-0.055em] text-balance">
            Your accounts stay yours.
          </h2>
          <p className="mt-6 max-w-[36ch] text-[14px] leading-[1.7] text-white/48">
            Ownlane coordinates your identity. It does not become the owner of the places where
            that identity appears.
          </p>
        </div>

        <div className="border-t border-white/18">
          {trustPoints.map(([title, body], index) => (
            <div className="grid grid-cols-[40px_130px_1fr] border-b border-white/15 py-5" key={title}>
              <span className="font-mono text-[8px] text-white/28">0{index + 1}</span>
              <span className="text-[11.5px] font-semibold">{title}</span>
              <span className="text-[11.5px] leading-[1.6] text-white/45">{body}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
