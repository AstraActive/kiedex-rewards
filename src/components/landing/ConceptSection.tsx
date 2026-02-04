import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Scale, BarChart3 } from 'lucide-react';

const concepts = [
  {
    icon: TrendingUp,
    title: 'Trade-to-Earn Growth',
    description: 'Every trade you make contributes to your daily rewards. Active traders earn more KDX.',
  },
  {
    icon: Scale,
    title: 'Fair Rewards System',
    description: 'Rewards are distributed based on valid trading volume with anti-farming protections.',
  },
  {
    icon: BarChart3,
    title: 'Exchange-Grade Experience',
    description: 'Professional trading interface with real-time charts, leverage, and instant execution.',
  },
];

export function ConceptSection() {
  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Built to Become a Full Crypto Exchange
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            KieDex is designed to evolve into a full-scale crypto exchange. Our long-term 
            goal is to build a powerful trading ecosystem where real activity and community 
            growth shape the future platform.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 md:gap-6">
          {concepts.map((concept) => (
            <Card key={concept.title} className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                  <concept.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base md:text-lg">{concept.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{concept.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
