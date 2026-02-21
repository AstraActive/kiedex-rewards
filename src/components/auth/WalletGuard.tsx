import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { ConnectWalletScreen } from '@/components/wallet/ConnectWalletScreen';

/**
 * WalletGuard - Enforces mandatory wallet connection after login/signup.
 * Also shows a full-screen overlay when a wallet mismatch is detected
 * (user switched to a different wallet in MetaMask while logged in).
 *
 * This is completely separate from InactivityVerification which
 * handles session timeout re-verification.
 */
export function WalletGuard() {
  const { user } = useAuth();
  const { linkedWalletAddress, isLoadingLinkedWallet, walletSaved, walletMismatch } = useWallet();

  // Not logged in, or still loading — don't show anything
  if (!user || isLoadingLinkedWallet) return null;

  // Wrong wallet connected — show full-screen mismatch UI (uses existing handler in ConnectWalletScreen)
  if (walletMismatch) {
    return (
      <div className="fixed inset-0 z-[60] bg-background overflow-y-auto flex items-center justify-center p-4">
        <ConnectWalletScreen />
      </div>
    );
  }

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
