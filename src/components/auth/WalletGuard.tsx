import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { ConnectWalletScreen } from '@/components/wallet/ConnectWalletScreen';

/**
 * WalletGuard - Single responsibility: enforce wallet linking after login.
 * If a user is authenticated but has no linked wallet, this overlay
 * blocks all access until they connect and link a wallet.
 *
 * Wallet mismatch is handled separately by InactivityVerification
 * to avoid two overlays showing simultaneously.
 */
export function WalletGuard() {
  const { user } = useAuth();
  const { linkedWalletAddress, isLoadingLinkedWallet, walletSaved } = useWallet();

  // Not logged in, or still loading — don't show anything
  if (!user || isLoadingLinkedWallet) return null;

  // Wallet already linked — no guard needed
  if (linkedWalletAddress) return null;

  // Wallet was just saved this session — dismiss guard
  if (walletSaved) return null;

  // User is authenticated but has no wallet linked — block access
  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto flex items-center justify-center p-4">
      <ConnectWalletScreen verificationReason="initial-setup" />
    </div>
  );
}
