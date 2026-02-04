import { Badge } from '@/components/ui/badge';
import { Network, Wallet, BarChart3, LineChart } from 'lucide-react';

const technologies = [
  {
    icon: Network,
    name: 'Base Network',
    description: 'Chain',
  },
  {
    icon: Wallet,
    name: 'WalletConnect',
    description: 'Wallet Connection',
  },
  {
    icon: BarChart3,
    name: 'Binance Public API',
    description: 'Market Data',
  },
  {
    icon: LineChart,
    name: 'TradingView Charts',
    description: 'Chart UI',
  },
];

export function PoweredBySection() {
  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-xl md:text-2xl font-bold mb-2">
            Powered By
          </h2>
          <p className="text-xs text-muted-foreground">
            Built with industry-leading technologies
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {technologies.map((tech) => (
            <div 
              key={tech.name}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card/50 border border-border/50"
            >
              <tech.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{tech.name}</p>
                <p className="text-xs text-muted-foreground">{tech.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
