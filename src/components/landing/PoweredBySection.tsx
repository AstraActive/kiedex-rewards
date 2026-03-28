import { Network, Wallet, BarChart3, TrendingUp } from 'lucide-react';

const items = [
  {
    icon: Network,
    name: 'Base Network',
    description: 'Blockchain',
  },
  {
    icon: TrendingUp,
    name: 'Marqel Capital',
    description: 'Funding',
  },
  {
    icon: Wallet,
    name: 'WalletConnect',
    description: 'Wallet Connection',
  },
  {
    icon: TrendingUp,
    name: 'TPC',
    description: 'Funding',
  },
  {
    icon: BarChart3,
    name: 'Binance API',
    description: 'Market Data',
  },
];

// Duplicate for seamless infinite scroll
const doubled = [...items, ...items];

export function PoweredBySection() {
  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-xl md:text-2xl font-bold mb-2">Powered By</h2>
          <p className="text-xs text-muted-foreground">
            Built with industry-leading infrastructure
          </p>
        </div>

        {/* Single-line marquee — matches Partners section */}
        <div
          className="overflow-hidden"
          style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}
        >
          <div
            className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]"
            style={{ animationDuration: `${items.length * 5}s` }}
          >
            {doubled.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="group flex items-center gap-3 px-5 py-3 rounded-xl bg-card/40 border border-border/40 hover:border-primary/40 hover:bg-card/70 transition-all duration-300 shrink-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
