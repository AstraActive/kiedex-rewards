import { User, Wallet, Coins } from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: User,
    title: 'Sign in with Google',
    description: 'Quick and secure authentication using your Google account.',
  },
  {
    number: 2,
    icon: Wallet,
    title: 'Connect Wallet (Base Network)',
    description: 'Link your Web3 wallet on Base network for secure trading.',
  },
  {
    number: 3,
    icon: Coins,
    title: 'Trade & Earn KDX Daily',
    description: 'Start trading with Bonus USDT and earn real KDX rewards.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            How It Works
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Get started in three simple steps
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 md:gap-8 mb-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              {/* Step Number */}
              <div className="relative inline-flex mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.number}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-base md:text-lg font-semibold mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-xs sm:text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 md:p-4 max-w-xl mx-auto">
          Bonus USDT is a platform trading bonus (not withdrawable in MVP).
        </p>
      </div>
    </section>
  );
}
