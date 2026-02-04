import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useConnect } from 'wagmi';
import { Loader2, Wallet, RefreshCw, X, Smartphone, AlertCircle, ChevronDown, ExternalLink } from 'lucide-react';
import { useMobileWallet } from '@/hooks/useMobileWallet';
import { WalletDeepLinkButton } from './WalletDeepLinkButton';
import { openWalletDeepLink } from '@/lib/walletDeepLinks';
import { memo, useMemo, useState, useCallback } from 'react';

interface QuickConnectModalProps {
  isConnecting: boolean;
  hasTimedOut: boolean;
  failureCount?: number;
  onRetry: () => void;
  onCancel: () => void;
  onReset: () => void;
}

// Popular wallet icons - lightweight, no external loading
const POPULAR_WALLETS = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊' },
  { id: 'trust', name: 'Trust', icon: '🛡️' },
  { id: 'okx', name: 'OKX', icon: '⭕' },
  { id: 'coinbase', name: 'Coinbase', icon: '🔵' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈' },
  { id: 'safepal', name: 'SafePal', icon: '🔒' },
];

export const QuickConnectModal = memo(function QuickConnectModal({
  isConnecting,
  hasTimedOut,
  failureCount = 0,
  onRetry,
  onCancel,
  onReset,
}: QuickConnectModalProps) {
  const { connectors, connect, isPending } = useConnect();
  const { isNormalMobileBrowser, isMobile } = useMobileWallet();
  const [showMoreWallets, setShowMoreWallets] = useState(false);

  // Memoize connector lookups
  const walletConnectors = useMemo(() => {
    const metamask = connectors.find(c => c.name.toLowerCase().includes('metamask'));
    const walletConnect = connectors.find(c => c.name.toLowerCase().includes('walletconnect'));
    const coinbase = connectors.find(c => c.name.toLowerCase().includes('coinbase'));
    const trust = connectors.find(c => c.name.toLowerCase().includes('trust'));
    const injected = connectors.find(c => c.name.toLowerCase().includes('injected'));
    
    return { metamask, walletConnect, coinbase, trust, injected };
  }, [connectors]);

  // Additional wallets for "More" section
  const additionalConnectors = useMemo(() => 
    connectors.filter(c => 
      !['MetaMask', 'WalletConnect', 'Coinbase Wallet', 'Trust Wallet'].includes(c.name)
    ),
    [connectors]
  );

  const handleConnect = useCallback((connector: typeof connectors[0] | undefined) => {
    if (connector) {
      connect({ connector });
    }
  }, [connect]);

  // Timeout state with improved recovery options
  if (hasTimedOut) {
    return (
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10">
            <AlertCircle className="h-7 w-7 text-yellow-500" />
          </div>
          <CardTitle className="text-lg">Connection Timeout</CardTitle>
          <CardDescription className="text-sm">
            {failureCount >= 2 
              ? "Having trouble? Try opening in your wallet's browser."
              : "Wallet didn't respond. Try again or use a different method."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Button onClick={onRetry} className="w-full h-11">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Connection
          </Button>
          
          {isMobile && (
            <>
              <div className="relative py-2">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  Open in wallet app
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10"
                  onClick={() => openWalletDeepLink('metamask')}
                >
                  <span className="mr-1.5">🦊</span> MetaMask
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10"
                  onClick={() => openWalletDeepLink('trustwallet')}
                >
                  <span className="mr-1.5">🛡️</span> Trust
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10"
                  onClick={() => openWalletDeepLink('okx')}
                >
                  <span className="mr-1.5">⭕</span> OKX
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10"
                  onClick={() => openWalletDeepLink('coinbase')}
                >
                  <span className="mr-1.5">🔵</span> Coinbase
                </Button>
              </div>
            </>
          )}
          
          <div className="flex gap-2 pt-1">
            <Button 
              variant="ghost" 
              onClick={onReset} 
              className="flex-1 h-10 text-muted-foreground text-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reset
            </Button>
            <Button variant="ghost" onClick={onCancel} className="flex-1 h-10 text-sm">
              <X className="w-3.5 h-3.5 mr-1.5" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connecting state - minimal, fast rendering
  if (isConnecting || isPending) {
    return (
      <Card className="w-full max-w-md border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="relative mb-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
          <div className="text-base font-medium mb-1">Connecting...</div>
          <p className="text-muted-foreground text-sm text-center mb-1">
            Confirm in your wallet app
          </p>
          <p className="text-muted-foreground/50 text-xs text-center mb-5">
            Auto-timeout in 10 seconds
          </p>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default wallet selection state - optimized for mobile
  return (
    <Card className="w-full max-w-md border-border/50">
      {/* Header */}
      <CardHeader className="text-center pb-3">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Wallet className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-lg">Connect Wallet</CardTitle>
        <CardDescription className="text-sm">
          Fast & secure connection. Best experience on mobile = wallet browser.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-0">
        {/* Recommended Buttons - Always visible */}
        <div className="space-y-2">
          <Button
            className="w-full h-12 justify-start gap-3 text-base"
            onClick={() => handleConnect(walletConnectors.metamask)}
            disabled={!walletConnectors.metamask}
          >
            <span className="text-xl">🦊</span>
            <span className="flex-1 text-left">Connect MetaMask</span>
            <span className="text-xs bg-primary-foreground/20 px-2 py-0.5 rounded">Recommended</span>
          </Button>
          
          <Button
            variant="outline"
            className="w-full h-12 justify-start gap-3"
            onClick={() => handleConnect(walletConnectors.walletConnect)}
            disabled={!walletConnectors.walletConnect}
          >
            <span className="text-xl">🔗</span>
            <span className="flex-1 text-left">Connect with WalletConnect</span>
          </Button>
        </div>

        {/* Mobile-only: Open in Wallet Browser Section */}
        {isNormalMobileBrowser && (
          <>
            <div className="relative py-1">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                Open in Wallet Browser
              </span>
            </div>
            
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">Best for Mobile</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="h-10 justify-start gap-2"
                  onClick={() => openWalletDeepLink('metamask')}
                >
                  <span>🦊</span>
                  <span className="text-xs">MetaMask</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="h-10 justify-start gap-2"
                  onClick={() => openWalletDeepLink('trustwallet')}
                >
                  <span>🛡️</span>
                  <span className="text-xs">Trust</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="h-10 justify-start gap-2"
                  onClick={() => openWalletDeepLink('okx')}
                >
                  <span>⭕</span>
                  <span className="text-xs">OKX</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="h-10 justify-start gap-2"
                  onClick={() => openWalletDeepLink('coinbase')}
                >
                  <span>🔵</span>
                  <span className="text-xs">Coinbase</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Popular Wallets Grid - Lightweight */}
        <div>
          <div className="relative py-1 mb-2">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              Popular Wallets
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {POPULAR_WALLETS.map((wallet) => {
              const connector = connectors.find(c => 
                c.name.toLowerCase().includes(wallet.id.toLowerCase())
              );
              return (
                <Button
                  key={wallet.id}
                  variant="outline"
                  size="sm"
                  className="h-14 flex-col gap-1 p-2"
                  onClick={() => connector ? connect({ connector }) : openWalletDeepLink(wallet.id as string)}
                >
                  <span className="text-lg">{wallet.icon}</span>
                  <span className="text-[10px] text-muted-foreground">{wallet.name}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* More Wallets - Collapsible */}
        {additionalConnectors.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-9 text-muted-foreground"
              onClick={() => setShowMoreWallets(!showMoreWallets)}
            >
              <ChevronDown className={`w-4 h-4 mr-1.5 transition-transform ${showMoreWallets ? 'rotate-180' : ''}`} />
              {showMoreWallets ? 'Hide' : 'More'} wallets
            </Button>
            
            {showMoreWallets && (
              <div className="space-y-1.5 mt-2">
                {additionalConnectors.map((connector) => (
                  <Button
                    key={connector.uid}
                    variant="ghost"
                    size="sm"
                    className="w-full h-10 justify-start"
                    onClick={() => connect({ connector })}
                  >
                    <Wallet className="w-4 h-4 mr-2 text-muted-foreground" />
                    {connector.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Reset connection option */}
        <Button 
          variant="ghost" 
          onClick={onReset} 
          className="w-full h-9 text-muted-foreground text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Reset Connection
        </Button>
      </CardContent>
    </Card>
  );
});
