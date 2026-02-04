import { Card, CardContent } from '@/components/ui/card';
import { 
  Gift, 
  ArrowUpDown, 
  Gauge, 
  Activity, 
  LineChart, 
  Coins, 
  Trophy, 
  Users 
} from 'lucide-react';

const features = [
  {
    icon: Gift,
    title: 'Bonus USDT Onboarding',
    description: 'Start trading instantly with platform bonus credits.',
  },
  {
    icon: ArrowUpDown,
    title: 'Futures-Style Long/Short',
    description: 'Trade both directions on any market movement.',
  },
  {
    icon: Gauge,
    title: 'Up to 50x Leverage',
    description: 'Amplify your positions with adjustable leverage.',
  },
  {
    icon: Activity,
    title: 'Real-Time Market Prices',
    description: 'Live price feeds directly from Binance.',
  },
  {
    icon: LineChart,
    title: 'Pro Trading Charts',
    description: 'TradingView-powered interactive charts.',
  },
  {
    icon: Coins,
    title: 'Daily KDX Rewards',
    description: 'Earn tokens from the daily reward pool.',
  },
  {
    icon: Trophy,
    title: 'Leaderboard Competition',
    description: 'Compete with traders for top rankings.',
  },
  {
    icon: Users,
    title: 'Referral + Tasks System',
    description: 'Invite friends and complete tasks for bonuses.',
  },
];

export function FeaturesGridSection() {
  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Exchange-Grade Features
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Everything you need for professional trading
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {features.map((feature) => (
            <Card 
              key={feature.title} 
              className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors"
            >
              <CardContent className="p-4 md:p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 mb-3">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm md:text-base font-semibold mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
