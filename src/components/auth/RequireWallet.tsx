import { useWallet } from '@/hooks/useWallet';
import { ConnectWalletScreen } from '@/components/wallet/ConnectWalletScreen';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface RequireWalletProps {
  children: React.ReactNode;
  pageName?: string; // e.g., "Rewards", "Trading", etc.
}

export function RequireWallet({ children, pageName }: RequireWalletProps) {
  const { address } = useAccount();
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

  // Debug logging
  useEffect(() => {
    console.log(`[RequireWallet ${pageName}] State:`, {
      address: address ? '0x...' + address.slice(-4) : null,
      isConnected,
      isReconnecting,
      walletSaved,
      isLoadingLinkedWallet,
      linkedWalletAddress: linkedWalletAddress ? '0x...' + linkedWalletAddress.slice(-4) : null,
    });
  }, [pageName, address, isConnected, isReconnecting, walletSaved, isLoadingLinkedWallet, linkedWalletAddress]);

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

  const loadingScreen = (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );

  // Show loading during wallet reconnection (tab switch, page reload)
  if (isReconnecting) {
    return loadingScreen;
  }

  // Show loading during initial profile fetch
  if (isLoadingLinkedWallet) {
    return loadingScreen;
  }

  // ─── USER ALREADY HAS A LINKED WALLET (verified before) ───
  // linkedWalletAddress is the source of truth - if set, user is verified.
  // They do NOT need an active wallet connection to view protected pages.
  if (linkedWalletAddress) {
    // If wallet IS connected, check for mismatch or errors
    if (isConnected) {
      if (walletMismatch) {
        return <ConnectWalletScreen pageName={pageName} />;
      }
      if (walletLinkError) {
        return <ConnectWalletScreen pageName={pageName} />;
      }
      if (isWrongNetwork) {
        return <ConnectWalletScreen pageName={pageName} />;
      }
    }
    // User is verified - let them through regardless of connection state
    return <>{children}</>;
  }

  // ─── FIRST-TIME USER - NO LINKED WALLET YET ───
  // These users must connect and link their wallet for the first time.

  if (isLinkingWallet) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  if (!isConnected && showConnectScreen) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  if (isWrongNetwork) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  // Connected but not yet linked
  if (!walletSaved) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  return <>{children}</>;
}
