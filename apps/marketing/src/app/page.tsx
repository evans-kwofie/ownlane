import { CapabilityGallery } from '@/components/capability-gallery';
import { ChangeScenario } from '@/components/change-scenario';
import { DriftEditorial } from '@/components/drift-editorial';
import { FragmentationBridge } from '@/components/fragmentation-bridge';
import { HowOwnlaneWorks } from '@/components/how-ownlane-works';
import { LandingClose } from '@/components/landing-close';
import { MarketingHero } from '@/components/marketing-hero';
import { SiteHeader } from '@/components/site-header';

export default function Home() {
  return (
    <main className="bg-background text-foreground">
      <SiteHeader />

      <MarketingHero />

      <FragmentationBridge />

      <DriftEditorial />

      <HowOwnlaneWorks />

      <ChangeScenario />

      <CapabilityGallery />



      <LandingClose />
    </main>
  );
}
