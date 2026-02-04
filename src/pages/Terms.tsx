import { AppLayout } from '@/components/layout/AppLayout';

export default function Terms() {
  return (
    <AppLayout showMobileNav={false}>
      <div className="container py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using KieDex, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Demo Trading Disclaimer</h2>
            <p className="text-muted-foreground">
              KieDex is a demo trading simulator. All trading activities are conducted using Demo USDT, which has no real monetary value. This platform is intended for educational and entertainment purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. KDX Rewards</h2>
            <p className="text-muted-foreground">
              KDX tokens are reward tokens distributed based on trading activity. The distribution rules, pool sizes, and reward mechanisms may be modified at any time to ensure platform integrity and prevent abuse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Trading Fees</h2>
            <p className="text-muted-foreground">
              Users must deposit Base ETH to pay trading fees. These fees are used for platform maintenance and operations. Fee structures may be updated with prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Wallet Connection</h2>
            <p className="text-muted-foreground">
              Users must connect their own cryptocurrency wallet. KieDex does not create, store, or have access to user private keys. Users are solely responsible for the security of their wallets.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Prohibited Activities</h2>
            <p className="text-muted-foreground">
              Users are prohibited from: manipulating trading volumes artificially, using automated bots without authorization, attempting to exploit platform vulnerabilities, or engaging in any fraudulent activities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Account Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate accounts that violate these terms or engage in suspicious activities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these terms at any time. Continued use of the platform constitutes acceptance of updated terms.
            </p>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
