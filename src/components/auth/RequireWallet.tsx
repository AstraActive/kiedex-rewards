import { useWallet } from '@/hooks/useWallet';
import { ConnectWalletScreen } from '@/components/wallet/ConnectWalletScreen';
import { useState, useEffect } from 'react';

interface RequireWalletProps {
  children: React.ReactNode;
  pageName?: string; // e.g., "Rewards", "Trading", etc.
}

export function RequireWallet({ children, pageName }: RequireWalletProps) {
  const { 
    isConnected, 
    isWrongNetwork, 
    walletSaved, 
    walletMismatch,
    walletLinkError,
    isLinkingWallet,
    isLoadingLinkedWallet,
    linkedWalletAddress,
    isReconnecting,
  } = useWallet();
  
  // Add a small delay before showing connect screen to prevent flash during tab switches
  const [showConnectScreen, setShowConnectScreen] = useState(false);
  
  useEffect(() => {
    // If wallet is reconnecting or connected, don't show connect screen
    if (isReconnecting || isConnected) {
      setShowConnectScreen(false);
      return;
    }
    
    // Add 300ms delay before showing connect screen to handle brief disconnections during tab switches
    const timer = setTimeout(() => {
      setShowConnectScreen(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isConnected, isReconnecting]);

  // Show simple loading during wallet reconnection (tab switch, etc.)
  if (isReconnecting) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show loading screen only during initial profile fetch
  // This should be very quick - don't block if wallet is already known to be linked
  if (isLoadingLinkedWallet) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  // Block if wallet mismatch - user connected wrong wallet
  if (walletMismatch) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  // Block if wallet link error occurred
  if (walletLinkError) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  // Block ONLY during first-time linking (not on every reload)
  if (isLinkingWallet) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  // Block if not connected (with delay to prevent flash during tab switches)
  if (!isConnected && showConnectScreen) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  // Block if wrong network
  if (isWrongNetwork) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  // Block if connected but wallet not verified yet
  // This covers the brief moment between connecting and verifying
  if (!walletSaved && linkedWalletAddress) {
    // User has a linked wallet but hasn't verified connection yet
    return <ConnectWalletScreen pageName={pageName} />;
  }

  // Block if no linked wallet and not yet saved
  // This is for first-time users who need to link
  if (!walletSaved && !linkedWalletAddress) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  return <>{children}</>;
}
