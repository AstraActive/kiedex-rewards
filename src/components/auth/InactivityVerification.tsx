import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectWalletScreen } from '@/components/wallet/ConnectWalletScreen';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute
const SESSION_KEY = 'kiedex_last_activity';
const VERIFIED_SESSION_KEY = 'kiedex_wallet_verified';

/**
 * InactivityVerification - Handles session security:
 * 1. Requires wallet re-verification on every sign-in (once per session)
 * 2. Re-prompts after 30 minutes of inactivity
 * 
 * NOTE: Mandatory wallet connection for new users is handled by WalletGuard.
 * This component only activates when a wallet is already linked.
 */
export function InactivityVerification() {
  const { user } = useAuth();
  const { linkedWalletAddress, isLoadingLinkedWallet, walletSaved } = useWallet();
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationReason, setVerificationReason] = useState<'sign-in' | 'session-expired'>('sign-in');
  const hasDisconnectedRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Check if user has verified wallet this session
  const isSessionVerified = useCallback(() => {
    try {
      return sessionStorage.getItem(VERIFIED_SESSION_KEY) === user?.id;
    } catch {
      return false;
    }
  }, [user?.id]);

  // Mark session as verified
  const markSessionVerified = useCallback(() => {
    try {
      if (user?.id) {
        sessionStorage.setItem(VERIFIED_SESSION_KEY, user.id);
      }
    } catch {
      // Ignore
    }
  }, [user?.id]);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(SESSION_KEY, String(now));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Check if session has expired due to inactivity
  const checkInactivity = useCallback(() => {
    if (!user || !linkedWalletAddress) return;
    const elapsed = Date.now() - lastActivityRef.current;
    if (elapsed >= INACTIVITY_TIMEOUT) {
      setVerificationReason('session-expired');
      setNeedsVerification(true);
      hasDisconnectedRef.current = false;
    }
  }, [user, linkedWalletAddress]);

  // On mount / user change: check if sign-in verification needed
  useEffect(() => {
    if (!user || !linkedWalletAddress || isLoadingLinkedWallet) return;

    if (!isSessionVerified()) {
      setVerificationReason('sign-in');
      setNeedsVerification(true);
      hasDisconnectedRef.current = false;
    } else {
      // Check inactivity timeout
      try {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          const storedTime = parseInt(stored, 10);
          if (!isNaN(storedTime)) {
            lastActivityRef.current = storedTime;
            if (Date.now() - storedTime >= INACTIVITY_TIMEOUT) {
              setVerificationReason('session-expired');
              setNeedsVerification(true);
              hasDisconnectedRef.current = false;
            }
          }
        }
      } catch {
        // Ignore
      }
    }
  }, [user, linkedWalletAddress, isLoadingLinkedWallet, isSessionVerified]);

  // When verification is needed and wallet is still connected, disconnect it
  // so user must freshly reconnect to prove ownership
  useEffect(() => {
    if (needsVerification && isConnected && !hasDisconnectedRef.current) {
      hasDisconnectedRef.current = true;
      disconnect();
    }
  }, [needsVerification, isConnected, disconnect]);

  // When wallet is verified (walletSaved becomes true), mark session as verified
  useEffect(() => {
    if (needsVerification && walletSaved && hasDisconnectedRef.current) {
      setNeedsVerification(false);
      markSessionVerified();
      updateActivity();
    }
  }, [needsVerification, walletSaved, markSessionVerified, updateActivity]);

  // Track user activity events
  useEffect(() => {
    if (!user || !linkedWalletAddress) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const throttledUpdate = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        if (!needsVerification) updateActivity();
      }, 10000);
    };

    events.forEach(event => window.addEventListener(event, throttledUpdate, { passive: true }));
    checkIntervalRef.current = setInterval(checkInactivity, ACTIVITY_CHECK_INTERVAL);
    if (!needsVerification) updateActivity();

    return () => {
      events.forEach(event => window.removeEventListener(event, throttledUpdate));
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user, linkedWalletAddress, needsVerification, updateActivity, checkInactivity]);

  // Don't render if not needed
  if (!user || !linkedWalletAddress || isLoadingLinkedWallet || !needsVerification) {
    return null;
  }

  // Show the original ConnectWalletScreen in a fullscreen overlay
  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto flex items-center justify-center p-4">
      <ConnectWalletScreen verificationReason={verificationReason} />
    </div>
  );
}
