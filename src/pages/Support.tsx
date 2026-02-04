import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, FileQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Support() {
  return (
    <AppLayout showMobileNav={false}>
      <div className="container py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Support</h1>
        <p className="text-muted-foreground mb-8">
          Need help? We're here for you.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <FileQuestion className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>FAQ</CardTitle>
              <CardDescription>
                Find answers to common questions about trading, rewards, and wallet setup.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/faq">
                <Button variant="outline" className="w-full">View FAQ</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Email Support</CardTitle>
              <CardDescription>
                Contact our support team directly for technical issues or account problems.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="mailto:support@kiedex.com">
                <Button variant="outline" className="w-full">support@kiedex.com</Button>
              </a>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Common Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Wallet won't connect?</h3>
              <p className="text-sm text-muted-foreground">
                Make sure you're using a supported wallet (MetaMask or WalletConnect) and are on Base network.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Can't open a trade?</h3>
              <p className="text-sm text-muted-foreground">
                Check that you have sufficient Demo USDT for margin and Base ETH for fees.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Rewards not showing?</h3>
              <p className="text-sm text-muted-foreground">
                Rewards are calculated at UTC midnight and become claimable the next day. Make sure your positions were open for at least 10 seconds.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Google sign-in not working?</h3>
              <p className="text-sm text-muted-foreground">
                Try clearing your browser cache, disabling ad blockers, or using an incognito window.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
