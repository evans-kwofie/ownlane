import type { SimpleIcon } from 'simple-icons';
import {
  siFigma,
  siGithub,
  siInstagram,
  siSpotify,
  siSubstack,
  siTiktok,
  siX,
  siYoutube,
} from 'simple-icons';
import { OwnlaneMark } from '@ownlane/ui/components/ownlane-mark';

const platforms: Array<{ icon: SimpleIcon; name: string; position: string }> = [
  {
    icon: siInstagram,
    name: 'Instagram',
    position: 'top-[6%] left-1/2 -translate-x-1/2',
  },
  {
    icon: siGithub,
    name: 'GitHub',
    position: 'top-[17.5%] left-[78.3%] -translate-x-1/2',
  },
  {
    icon: siSubstack,
    name: 'Substack',
    position: 'top-1/2 left-[90%] -translate-x-1/2 -translate-y-1/2',
  },
  {
    icon: siYoutube,
    name: 'YouTube',
    position: 'bottom-[17.5%] left-[78.3%] -translate-x-1/2',
  },
  {
    icon: siSpotify,
    name: 'Spotify',
    position: 'bottom-[6%] left-1/2 -translate-x-1/2',
  },
  {
    icon: siX,
    name: 'X',
    position: 'bottom-[17.5%] left-[21.7%] -translate-x-1/2',
  },
  {
    icon: siFigma,
    name: 'Figma',
    position: 'top-1/2 left-[10%] -translate-x-1/2 -translate-y-1/2',
  },
  {
    icon: siTiktok,
    name: 'TikTok',
    position: 'top-[17.5%] left-[21.7%] -translate-x-1/2',
  },
];

function BrandIcon({ icon }: { icon: SimpleIcon }) {
  return (
    <svg
      aria-hidden="true"
      className="size-[17px] shrink-0"
      fill="currentColor"
      style={{ color: `#${icon.hex}` }}
      viewBox="0 0 24 24"
    >
      <path d={icon.path} />
    </svg>
  );
}

/** Places where one identity already lives, not a compatibility list. */
export function FragmentationBridge() {
  return (
    <section className="border-b border-border bg-muted" id="fragmentation">
      <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1200px] items-center gap-12 py-16 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16 lg:py-20">
        <div>
          <h2 className="max-w-[19ch] text-[clamp(2rem,3.3vw,3rem)] leading-[1.04] font-semibold tracking-[-0.04em] text-balance">
            One person. Twelve places introducing them differently.
          </h2>

          <p className="mt-6 max-w-[40ch] text-[16px] leading-[1.7] text-muted-foreground">
            Your identity is split between profiles, portfolios, channels, bios, and accounts. Each
            place holds a useful fragment. None of them holds the whole person.
          </p>
        </div>

        <div className="mx-auto w-full max-w-125">
          <div className="relative aspect-square" aria-label="Platforms orbiting one identity">
            <div
              aria-hidden="true"
              className="absolute inset-[10%] rounded-full border border-black/15"
            />
            <div
              aria-hidden="true"
              className="absolute inset-[25%] rounded-full border border-black/15"
            />

            <div className="absolute top-1/2 left-1/2 z-20 grid size-[88px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-black bg-background shadow-[0_10px_24px_-18px_rgba(0,0,0,0.45)] sm:size-[100px]">
              <div className="flex flex-col items-center gap-2">
                <OwnlaneMark className="size-6 text-primary" variant="open" />
                <span className="text-[10px] font-medium tracking-[-0.01em]">One identity</span>
              </div>
            </div>

            {platforms.map((platform, index) => (
              <div
                aria-label={platform.name}
                className={`absolute z-10 ${platform.position}`}
                key={platform.name}
              >
                <div
                  className="ownlane-orbit-node flex size-9 items-center justify-center gap-2 rounded-full border border-black/15 bg-background shadow-[0_7px_18px_-16px_rgba(0,0,0,0.45)] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-black/30 sm:h-10 sm:w-[108px] sm:rounded-full sm:px-3"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <BrandIcon icon={platform.icon} />
                  <span className="hidden text-[10.5px] font-medium sm:inline">{platform.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
