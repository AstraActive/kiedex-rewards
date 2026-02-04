import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Fuel } from 'lucide-react';

const highlightChips = [
  { label: 'Bonus USDT Onboarding' },
  { label: 'Up to 50x Leverage' },
  { label: 'Oil Fuel Fees', icon: Fuel },
  { label: 'Daily Reward Pool' },
];

export function HeroSection() {
  const { user } = useAuth();

  const scrollToRewards = () => {
    document.getElementById('rewards-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="container py-12 md:py-20 lg:py-28">
      <div className="max-w-4xl mx-auto text-center">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 md:mb-6">
          KieDex — Trade Futures.{' '}
          <span className="text-primary">Earn KDX Daily.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed">
          KieDex is a Trade-to-Earn exchange experience built for speed, fairness, 
          and long-term growth. Start with Bonus USDT, trade top markets with leverage, 
          and earn KDX rewards as part of the future KDX airdrop ecosystem.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8">
          {user ? (
            <Link to="/dashboard">
              <Button size="lg" className="min-w-[200px]">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="lg" className="min-w-[200px]">
                Sign In
              </Button>
            </Link>
          )}
          <Button 
            variant="outline" 
            size="lg" 
            className="min-w-[200px]"
            onClick={scrollToRewards}
          >
            Explore Rewards
          </Button>
        </div>

        {/* Highlight Chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {highlightChips.map((chip) => (
            <Badge 
              key={chip.label} 
              variant="secondary" 
              className="px-3 py-1.5 text-xs sm:text-sm font-medium"
            >
              {chip.icon && <chip.icon className="h-3 w-3 mr-1" />}
              {chip.label}
            </Badge>
          ))}
        </div>

        {/* Trust Line */}
        <p className="text-xs sm:text-sm text-muted-foreground">
          Wallet connection required after sign-in • No private keys stored
        </p>
      </div>
    </section>
  );
}
