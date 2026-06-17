import { TopAppBar } from '../components/landing/TopAppBar';
import { HeroSection } from '../components/landing/HeroSection';
import { FeatureGrid } from '../components/landing/FeatureGrid';
import { PricingSection } from '../components/landing/PricingSection';
import { Footer } from '../components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col antialiased">
      <TopAppBar />
      <main className="flex-grow pt-[80px]">
        <HeroSection />
        <FeatureGrid />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
