import { AppLayout } from '@/components/layout/AppLayout';

export default function Privacy() {
  return (
    <AppLayout showMobileNav={false}>
      <div className="container py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide when signing in with Google (email address) and your connected wallet address. We also collect trading activity data and platform usage statistics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              Your information is used to: provide and maintain the trading platform, calculate and distribute rewards, prevent fraud and abuse, improve our services, and communicate important updates.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Wallet Security</h2>
            <p className="text-muted-foreground">
              We never store, access, or have control over your wallet private keys. Wallet connections are handled through industry-standard protocols (WalletConnect, MetaMask) that do not expose your private keys.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Storage</h2>
            <p className="text-muted-foreground">
              Your data is stored securely using industry-standard encryption and security practices. We retain your data for as long as your account is active or as needed to provide services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Third-Party Services</h2>
            <p className="text-muted-foreground">
              We use Google for authentication and Binance public APIs for real-time price data. These services have their own privacy policies that govern their use of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cookies and Tracking</h2>
            <p className="text-muted-foreground">
              We use essential cookies and local storage for authentication and session management. We do not use tracking cookies for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to access, correct, or delete your personal data. You can also request a copy of your data or ask us to stop processing it. Contact support@kiedex.com for requests.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this privacy policy, please contact us at support@kiedex.com.
            </p>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
