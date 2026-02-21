import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, AlertTriangle, Link2, Shield, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useConnectionTimeout } from '@/hooks/useConnectionTimeout';
import { QuickConnectModal } from './QuickConnectModal';

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface ConnectWalletScreenProps {
  pageName?: string; // e.g., "Rewards", "Trading", etc.
  verificationReason?: 'sign-in' | 'session-expired' | 'initial-setup' | 'new-browser' | 'inactive';
}

export function ConnectWalletScreen({ pageName, verificationReason }: ConnectWalletScreenProps = {}) {
  const {
    isConnected,
    isWrongNetwork,
    switchToBase,
    walletSaved,
    linkedWalletAddress,
    walletMismatch,
    isLinkingWallet,
    walletLinkError,
    address,
    disconnectWallet,
    isLoadingLinkedWallet,
    resetWalletConnection,
    isReconnecting,
  } = useWallet();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const {
    isConnecting,
    hasTimedOut,
    failureCount,
    cancelConnection,
    retryConnection,
    resetAndClearCache,
  } = useConnectionTimeout();

  // Compute context-aware messages based on verificationReason
  const getContextMessages = () => {
    if (verificationReason === 'initial-setup') {
      return {
        cardTitle: 'Connect Your Wallet',
        cardDescription: 'Link a wallet to start using KieDex',
        warningTitle: 'Wallet Required',
        warningMessage: 'You need to connect and link a Base network wallet to access the platform. This wallet will be permanently linked to your account.',
        loadingTitle: 'Setting Up Your Account',
        loadingDescription: 'Connecting your wallet...',
      };
    }
    if (verificationReason === 'sign-in') {
      return {
        cardTitle: 'Welcome Back!',
        cardDescription: 'Verify your identity by connecting your linked wallet',
        warningTitle: 'Sign-In Verification',
        warningMessage: 'For security, please connect your linked wallet to verify your identity each time you sign in.',
        loadingTitle: 'Verifying Identity',
        loadingDescription: 'Connecting to your linked wallet...',
      };
    }
    if (verificationReason === 'new-browser') {
      return {
        cardTitle: 'New Browser Detected',
        cardDescription: 'Connect your linked wallet to verify it\'s you',
        warningTitle: 'Browser Verification Required',
        warningMessage: 'This is the first time you\'re accessing KieDex from this browser. Please connect your linked wallet to confirm your identity.',
        loadingTitle: 'Verifying Browser',
        loadingDescription: 'Connecting to your linked wallet...',
      };
    }
    if (verificationReason === 'inactive' || verificationReason === 'session-expired') {
      return {
        cardTitle: 'Verification Required',
        cardDescription: 'You\'ve been away for more than 5 days',
        warningTitle: '5-Day Inactivity Check',
        warningMessage: 'You haven\'t been active for 5 or more days. Please reconnect your linked wallet to resume your session securely.',
        loadingTitle: 'Resuming Session',
        loadingDescription: 'Reconnecting to your wallet...',
      };
    }
    const pageTitle = pageName ? `${pageName} Page` : 'This Page';
    return {
      cardTitle: 'Connect Your Wallet to Continue',
      cardDescription: `${pageTitle} requires wallet verification`,
      warningTitle: 'Wallet Verification Required',
      warningMessage: pageName
        ? `The ${pageName} page requires your linked wallet to access your account.`
        : 'This page requires your linked wallet to verify your identity.',
      loadingTitle: 'Wallet Connection Required',
      loadingDescription: `${pageTitle} requires wallet verification`,
    };
  };

  const contextMessages = getContextMessages();

  // ── PRIORITY 1: Wrong wallet connected — always show this first ──────────
  // Must be BEFORE isReconnecting check because on mobile (WalletConnect),
  // isReconnecting stays true indefinitely, hiding this screen forever.
  if (walletMismatch && linkedWalletAddress && address) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Wrong Wallet Connected</CardTitle>
            <CardDescription>
              Please connect your linked wallet to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Linked wallet:</p>
                <p className="font-mono text-sm font-medium text-primary">
                  {formatAddress(linkedWalletAddress)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-muted-foreground mb-1">Currently connected:</p>
                <p className="font-mono text-sm font-medium text-destructive">
                  {formatAddress(address)}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Please disconnect and connect the correct wallet to continue.
            </p>

            <Button onClick={disconnectWallet} className="w-full">
              Disconnect & Try Again
            </Button>
            <Button variant="outline" onClick={resetWalletConnection} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Connection
            </Button>
            <Button variant="ghost" onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  // ── PRIORITY 2: Loading / reconnecting ───────────────────────────────────
  if (isLoadingLinkedWallet || isReconnecting) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{contextMessages.loadingTitle}</CardTitle>
            <CardDescription>{contextMessages.loadingDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-500 mb-1">Security Verification</p>
                  <p className="text-muted-foreground">{contextMessages.warningMessage}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">
                {isReconnecting ? 'Reconnecting to your wallet...' : 'Verifying wallet...'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Please wait, this will only take a moment</p>
            </div>
            {linkedWalletAddress && (
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-xs text-muted-foreground mb-1">Your linked wallet:</p>
                <p className="font-mono text-sm font-medium text-primary">{formatAddress(linkedWalletAddress)}</p>
              </div>
            )}
            <div className="pt-2 text-center">
              <p className="text-xs text-muted-foreground">Cannot dismiss • Wallet connection is required</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── PRIORITY 3: Wrong network ────────────────────────────────────────────
  if (isWrongNetwork) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Wrong Network</CardTitle>
            <CardDescription>Please switch to Base network to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-sm">You're connected to the wrong network</span>
            </div>
            <Button onClick={switchToBase} className="w-full">Switch to Base Network</Button>
            <Button variant="outline" onClick={resetWalletConnection} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />Reset Connection
            </Button>
            <Button variant="ghost" onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Wallet link error state
  if (walletLinkError) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Cannot Link Wallet</CardTitle>
            <CardDescription>
              {walletLinkError}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={disconnectWallet} className="w-full">
              Disconnect & Try Another Wallet
            </Button>
            <Button variant="outline" onClick={resetWalletConnection} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Connection
            </Button>
            <Button variant="ghost" onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Linking in progress - ONLY shows on first-time linking
  if (isLinkingWallet) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Linking wallet to your account...</p>
            <p className="text-xs text-muted-foreground mt-2">This only happens once</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected but verifying wallet (brief state)
  if (isConnected && !walletSaved && linkedWalletAddress) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground text-sm">Verifying wallet...</p>
        </div>
      </div>
    );
  }

  // Mobile: Use QuickConnectModal for first-time users
  if (isMobile && !linkedWalletAddress && !isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <QuickConnectModal
          isConnecting={isConnecting}
          hasTimedOut={hasTimedOut}
          failureCount={failureCount}
          onRetry={retryConnection}
          onCancel={cancelConnection}
          onReset={resetAndClearCache}
        />
      </div>
    );
  }

  // Returning user - need to connect their saved wallet
  if (linkedWalletAddress && !isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{contextMessages.cardTitle}</CardTitle>
            <CardDescription>
              {contextMessages.cardDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-500 mb-1">{contextMessages.warningTitle}</p>
                  <p className="text-muted-foreground">
                    {contextMessages.warningMessage}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-xs text-muted-foreground mb-2">Your linked wallet:</p>
              <p className="font-mono text-lg font-semibold text-primary">
                {formatAddress(linkedWalletAddress)}
              </p>
            </div>

            <p className="text-sm font-medium text-center">
              Please connect this wallet to continue
            </p>

            <div className="flex justify-center">
              <ConnectButton />
            </div>

            <Button variant="outline" onClick={resetWalletConnection} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Connection
            </Button>

            <Button variant="ghost" onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // First-time user - need to link a wallet (Desktop)
  if (!linkedWalletAddress && !isConnected) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Link2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Link Your Wallet</CardTitle>
            <CardDescription>
              Connect your wallet to permanently link it to this account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-500 mb-1">One-Time Action</p>
                  <p className="text-muted-foreground">
                    Your wallet will be permanently bound to this account.
                    You won't be able to change it later or use this wallet with another account.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ConnectButton />
            </div>

            <Button variant="ghost" onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>

            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-2">Why link a wallet?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Trade demo futures with no real money at risk</li>
                <li>• Earn KDX rewards based on your trading activity</li>
                <li>• Deposit Base ETH once to pay trading fees</li>
                <li>• Your wallet, your control - we never store keys</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback - generic connect screen
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
          <CardDescription>
            Connect your wallet to access trading, rewards, and all features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <ConnectButton />
          </div>

          <Button variant="outline" onClick={resetWalletConnection} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Connection
          </Button>

          <Button variant="ghost" onClick={signOut} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>

          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-2">Why connect a wallet?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Trade demo futures with no real money at risk</li>
              <li>• Earn KDX rewards based on your trading activity</li>
              <li>• Deposit Base ETH once to pay trading fees</li>
              <li>• Your wallet, your control - we never store keys</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
