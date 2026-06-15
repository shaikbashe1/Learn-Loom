import { TopAppBar } from '../components/landing/TopAppBar';
import { HeroSection } from '../components/landing/HeroSection';
import { SocialProof } from '../components/landing/SocialProof';
import { FeatureGrid } from '../components/landing/FeatureGrid';
import { LoomiePreview } from '../components/landing/LoomiePreview';
import { PricingSection } from '../components/landing/PricingSection';
import { Footer } from '../components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="bg-background text-on-surface font-body-md antialiased overflow-x-hidden selection:bg-primary/30 selection:text-primary min-h-screen">
      <TopAppBar />
      <main className="pt-[80px] min-h-screen">
        <HeroSection />
        <SocialProof />
        <FeatureGrid />
        <LoomiePreview />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
