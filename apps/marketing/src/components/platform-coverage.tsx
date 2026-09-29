import type { SimpleIcon } from 'simple-icons';
import { siFigma, siGithub, siInstagram, siSpotify, siSubstack, siTiktok, siX, siYoutube } from 'simple-icons';

const platforms: Array<{ icon: SimpleIcon; name: string }> = [
  { icon: siInstagram, name: 'Instagram' },
  { icon: siGithub, name: 'GitHub' },
  { icon: siYoutube, name: 'YouTube' },
  { icon: siX, name: 'X' },
  { icon: siSpotify, name: 'Spotify' },
  { icon: siSubstack, name: 'Substack' },
  { icon: siFigma, name: 'Figma' },
  { icon: siTiktok, name: 'TikTok' },
];

function BrandIcon({ icon }: { icon: SimpleIcon }) {
  return (
    <svg aria-hidden="true" className="size-5" fill="currentColor" style={{ color: `#${icon.hex}` }} viewBox="0 0 24 24">
      <path d={icon.path} />
    </svg>
  );
}

const capabilities = [
  ['Write', 'Ownlane can make the permitted change for you.'],
  ['Read', 'Ownlane can compare what is public against your record.'],
  ['Guided', 'You get the exact value, destination, and completion state.'],
  ['Unsupported', 'Ownlane says plainly when a field cannot be reached.'],
];

export function PlatformCoverage() {
  return (
    <section className="border-y border-border bg-background" id="coverage">
      <div className="mx-auto grid w-full max-w-[1120px] gap-14 px-6 py-20 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20 lg:py-24">
        <div>
          <p className="max-w-[42ch] text-[15px] leading-[1.72] text-muted-foreground">
            Platform permissions vary by account and field. Ownlane shows the difference before you
            connect—and never disguises a manual step as automation.
          </p>

          <div className="mt-10 grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-black/12 bg-black/12 sm:grid-cols-8 lg:grid-cols-4">
            {platforms.map((platform) => (
              <div className="grid aspect-square place-items-center bg-background" key={platform.name} title={platform.name}>
                <BrandIcon icon={platform.icon} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[9px] text-black/38">
            Examples of where identities live—not a universal write-compatibility claim.
          </p>
        </div>

        <div className="border-t border-black/18">
          {capabilities.map(([name, description], index) => (
            <div className="grid grid-cols-[52px_92px_1fr] items-start border-b border-black/15 py-5" key={name}>
              <span className="font-mono text-[8px] text-black/32">0{index + 1}</span>
              <span className="text-[12px] font-semibold">{name}</span>
              <span className="text-[12px] leading-[1.6] text-black/48">{description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
