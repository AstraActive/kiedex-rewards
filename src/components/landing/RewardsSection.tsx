import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Trophy, Users, Shield, Coins } from 'lucide-react';

const bulletPoints = [
  { icon: Coins, text: 'Rewards distributed daily based on valid trading volume' },
  { icon: Shield, text: 'Built-in anti-spam & anti-farming protections' },
  { icon: Trophy, text: 'Leaderboard + referrals increase ecosystem participation' },
  { icon: Users, text: 'KDX represents participation in future KieDex ecosystem' },
];

export function RewardsSection() {
  return (
    <section id="rewards-section" className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Daily Rewards + Future KDX Airdrop
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Earn KDX tokens daily and be part of the future airdrop ecosystem
          </p>
        </div>

        {/* Big Pool Display */}
        <Card className="bg-primary/5 border-primary/20 mb-8">
          <CardContent className="py-8 md:py-12 text-center">
            <p className="text-muted-foreground text-sm mb-2">Daily Pool</p>
            <p className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-2">
              10,000 KDX
            </p>
            <p className="text-muted-foreground text-sm">
              Distributed daily to active traders
            </p>
          </CardContent>
        </Card>

        {/* Bullet Points */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {bulletPoints.map((point, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-4 rounded-lg bg-card/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <point.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {point.text}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <Link to="/rewards">
            <Button variant="outline" className="w-full sm:w-auto min-w-[160px]">
              View Rewards
            </Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="outline" className="w-full sm:w-auto min-w-[160px]">
              View Leaderboard
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
