import { useWallet } from '@/hooks/useWallet';
import { ConnectWalletScreen } from '@/components/wallet/ConnectWalletScreen';

interface RequireWalletProps {
  children: React.ReactNode;
}

export function RequireWallet({ children }: RequireWalletProps) {
  const { 
    isConnected, 
    isWrongNetwork, 
    walletSaved, 
    walletMismatch,
    walletLinkError,
    isLinkingWallet,
    isLoadingLinkedWallet,
    linkedWalletAddress,
  } = useWallet();

  // Show loading screen only during initial profile fetch
  // This should be very quick - don't block if wallet is already known to be linked
  if (isLoadingLinkedWallet) {
    return <ConnectWalletScreen />;
  }

  // Block if wallet mismatch - user connected wrong wallet
  if (walletMismatch) {
    return <ConnectWalletScreen />;
  }

  // Block if wallet link error occurred
  if (walletLinkError) {
    return <ConnectWalletScreen />;
  }

  // Block ONLY during first-time linking (not on every reload)
  if (isLinkingWallet) {
    return <ConnectWalletScreen />;
  }

  // Block if not connected
  if (!isConnected) {
    return <ConnectWalletScreen />;
  }

  // Block if wrong network
  if (isWrongNetwork) {
    return <ConnectWalletScreen />;
  }

  // Block if connected but wallet not verified yet
  // This covers the brief moment between connecting and verifying
  if (!walletSaved && linkedWalletAddress) {
    // User has a linked wallet but hasn't verified connection yet
    return <ConnectWalletScreen />;
  }

  // Block if no linked wallet and not yet saved
  // This is for first-time users who need to link
  if (!walletSaved && !linkedWalletAddress) {
    return <ConnectWalletScreen />;
  }

  return <>{children}</>;
}
