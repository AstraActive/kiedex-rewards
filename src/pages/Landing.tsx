import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { HeroSection } from '@/components/landing/HeroSection';
import { LiveMarketsSection } from '@/components/landing/LiveMarketsSection';
import { ConceptSection } from '@/components/landing/ConceptSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { RewardsSection } from '@/components/landing/RewardsSection';
import { OilFuelSection } from '@/components/landing/OilFuelSection';
import { FeaturesGridSection } from '@/components/landing/FeaturesGridSection';
import { SecuritySection } from '@/components/landing/SecuritySection';
import { PoweredBySection } from '@/components/landing/PoweredBySection';
import { RoadmapSection } from '@/components/landing/RoadmapSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect logged-in users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <main>
        <HeroSection />
        <LiveMarketsSection />
        <ConceptSection />
        <HowItWorksSection />
        <RewardsSection />
        <OilFuelSection />
        <FeaturesGridSection />
        <SecuritySection />
        <PoweredBySection />
        <RoadmapSection />
        <FinalCTASection />
      </main>

      <LandingFooter />
    </div>
  );
}
