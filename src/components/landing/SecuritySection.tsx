import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  Lock, 
  KeyRound, 
  Server, 
  Bot, 
  Zap,
  Check
} from 'lucide-react';

const securityPoints = [
  { icon: Lock, text: 'Google authentication + protected sessions' },
  { icon: KeyRound, text: 'Wallet connection required after sign-in' },
  { icon: Shield, text: 'No private key storage' },
  { icon: Server, text: 'Backend-verified rewards & volume' },
  { icon: Bot, text: 'Anti-bot, rate limits, anti-farming rules' },
  { icon: Zap, text: 'Scalable hosting + protection best practices' },
];

export function SecuritySection() {
  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">
              Secure. Fair. Built for Scale.
            </h2>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Your security and fair play are our top priorities
          </p>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-6 md:p-8">
            <div className="grid sm:grid-cols-2 gap-4">
              {securityPoints.map((point, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm text-foreground">
                    {point.text}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
