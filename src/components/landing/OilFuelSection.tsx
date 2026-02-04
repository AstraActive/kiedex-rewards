import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Fuel, Zap, ArrowRight } from 'lucide-react';

export function OilFuelSection() {
  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
          {/* Left: Content */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Fuel className="h-6 w-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">
                OIL — Trading Fuel
              </h2>
            </div>
            
            <p className="text-muted-foreground text-sm md:text-base mb-6 leading-relaxed">
              OIL is KieDex's internal fee credit system. Recharge once using Base ETH 
              and trade smoothly without per-trade confirmations. Focus on trading, 
              not transaction fees.
            </p>

            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Oil is consumed based on trade size and helps prevent spam trading.
              </span>
            </div>

            <Link to="/wallet">
              <Button className="group">
                Recharge Oil
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          {/* Right: Conversion Display */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6 md:p-8">
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Conversion Rate
              </p>
              
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Base ETH</p>
                  <p className="text-lg md:text-xl font-mono font-bold">0.00000001</p>
                </div>
                
                <ArrowRight className="h-5 w-5 text-primary" />
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Oil Credits</p>
                  <div className="flex items-center gap-1">
                    <Fuel className="h-5 w-5 text-primary" />
                    <p className="text-lg md:text-xl font-mono font-bold text-primary">15</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground text-center">
                  One-time recharge • No per-trade gas fees
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
