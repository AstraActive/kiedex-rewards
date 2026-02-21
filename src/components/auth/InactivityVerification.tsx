import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectWalletScreen } from '@/components/wallet/ConnectWalletScreen';

// 5 days in milliseconds
const INACTIVITY_TIMEOUT = 5 * 24 * 60 * 60 * 1000;
// Check every 5 minutes (no need to check every minute for a 5-day window)
const ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000;

// localStorage key helpers — these are per-user and per-browser
const getLastActiveKey = (userId: string) => `kiedex_last_active_${userId}`;
const getBrowserVerifiedKey = (userId: string) => `kiedex_browser_verified_${userId}`;

/**
 * InactivityVerification — Handles session security:
 *
 * 1. NEW BROWSER: If `kiedex_browser_verified_{userId}` is absent from localStorage
 *    (i.e. this browser has never been verified for this user), require wallet verification.
 *
 * 2. INACTIVITY: If the user's last recorded activity (`kiedex_last_active_{userId}`)
 *    is more than 5 days ago, require wallet re-verification.
 *
 * Both keys live in localStorage, so they are browser-specific and survive
 * page refreshes/tab closes, but are cleared when the user clears browser data.
 *
 * NOTE: First-time wallet linking (no linked wallet at all) is handled by WalletGuard.
 * This component only activates when a wallet is ALREADY linked.
 */
export function InactivityVerification() {
  const { user } = useAuth();
  const { linkedWalletAddress, isLoadingLinkedWallet, walletSaved, walletMismatch } = useWallet();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationReason, setVerificationReason] = useState<'new-browser' | 'inactive'>('new-browser');
  const hasDisconnectedRef = useRef(false);

  // ─── localStorage helpers ────────────────────────────────────────────────

  const isBrowserVerified = useCallback((userId: string): boolean => {
    try {
      return localStorage.getItem(getBrowserVerifiedKey(userId)) === '1';
    } catch {
      return false;
    }
  }, []);

  const markBrowserVerified = useCallback((userId: string) => {
    try {
      localStorage.setItem(getBrowserVerifiedKey(userId), '1');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const getLastActive = useCallback((userId: string): number | null => {
    try {
      const v = localStorage.getItem(getLastActiveKey(userId));
      if (!v) return null;
      const n = parseInt(v, 10);
      return isNaN(n) ? null : n;
    } catch {
      return null;
    }
  }, []);

  const updateLastActive = useCallback((userId: string) => {
    try {
      localStorage.setItem(getLastActiveKey(userId), String(Date.now()));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // ─── Initial check (on mount / user or wallet change) ───────────────────

  useEffect(() => {
    if (!user || !linkedWalletAddress || isLoadingLinkedWallet) return;

    const userId = user.id;

    // Check 1: Is this a new browser (no verification flag)?
    if (!isBrowserVerified(userId)) {
      setVerificationReason('new-browser');
      setNeedsVerification(true);
      hasDisconnectedRef.current = false;
      return;
    }

    // Check 2: Has user been inactive for more than 5 days?
    const lastActive = getLastActive(userId);
    if (lastActive === null || Date.now() - lastActive >= INACTIVITY_TIMEOUT) {
      setVerificationReason('inactive');
      setNeedsVerification(true);
      hasDisconnectedRef.current = false;
      return;
    }

    // All good — update last active timestamp so it stays fresh
    updateLastActive(userId);
  }, [user, linkedWalletAddress, isLoadingLinkedWallet, isBrowserVerified, getLastActive, updateLastActive]);

  // ─── Periodic inactivity check while the app is open ────────────────────

  useEffect(() => {
    if (!user || !linkedWalletAddress || needsVerification) return;

    const userId = user.id;
    const interval = setInterval(() => {
      const lastActive = getLastActive(userId);
      if (lastActive !== null && Date.now() - lastActive >= INACTIVITY_TIMEOUT) {
        setVerificationReason('inactive');
        setNeedsVerification(true);
        hasDisconnectedRef.current = false;
      }
    }, ACTIVITY_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user, linkedWalletAddress, needsVerification, getLastActive]);

  // ─── Track user activity to update last-active timestamp ────────────────

  useEffect(() => {
    if (!user || !linkedWalletAddress || needsVerification) return;

    const userId = user.id;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    const throttledUpdate = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        updateLastActive(userId);
      }, 10_000); // max once every 10 seconds
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(e => window.addEventListener(e, throttledUpdate, { passive: true }));

    return () => {
      events.forEach(e => window.removeEventListener(e, throttledUpdate));
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user, linkedWalletAddress, needsVerification, updateLastActive]);

  // ─── When verification needed, disconnect the wallet so user must re-connect ─
  // IMPORTANT: If no wallet is connected when verification triggers (common on mobile),
  // mark hasDisconnectedRef immediately so it won't fire when the user connects a
  // wrong wallet for the first time (which would prevent the mismatch screen from showing).

  useEffect(() => {
    if (!needsVerification) return;

    if (!isConnected) {
      // Nothing to disconnect — mark done so the next connection isn't auto-disconnected
      hasDisconnectedRef.current = true;
      return;
    }

    if (!hasDisconnectedRef.current) {
      // Wallet was connected when verification triggered — force reconnect
      hasDisconnectedRef.current = true;
      disconnect();
    }
  }, [needsVerification, isConnected, disconnect]);

  // ─── When wallet verified successfully (walletSaved flips true, NOT mismatch) ─

  useEffect(() => {
    // Only dismiss when the CORRECT wallet was connected (walletSaved=true, walletMismatch=false)
    if (needsVerification && walletSaved && !walletMismatch && hasDisconnectedRef.current && user) {
      markBrowserVerified(user.id);
      updateLastActive(user.id);
      setNeedsVerification(false);
    }
  }, [needsVerification, walletSaved, walletMismatch, user, markBrowserVerified, updateLastActive]);

  // ─── Render ──────────────────────────────────────────────────────────────

  // Show for: (1) inactivity/new-browser verification, OR (2) wallet mismatch
  if (!user || !linkedWalletAddress || isLoadingLinkedWallet) return null;
  if (!needsVerification && !walletMismatch) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto flex items-center justify-center p-4">
      {/* walletMismatch overrides verificationReason so the mismatch UI shows correctly */}
      <ConnectWalletScreen
        verificationReason={walletMismatch ? undefined : verificationReason}
      />
    </div>
  );
}
