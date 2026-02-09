import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute
const SESSION_KEY = 'kiedex_last_activity';
const VERIFIED_SESSION_KEY = 'kiedex_wallet_verified';

/**
 * InactivityVerification - Global component that:
 * 1. Requires wallet verification on every sign-in (once per session)
 * 2. Re-prompts after 30 minutes of inactivity
 * 
 * - User already has a permanent wallet linked at account creation
 * - On sign-in, user must connect same wallet to verify identity
 * - After verification, user can browse freely
 * - After 30 min inactivity, must re-verify
 */
export function InactivityVerification() {
  const { user } = useAuth();
  const { linkedWalletAddress, isLoadingLinkedWallet } = useWallet();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [needsVerification, setNeedsVerification] = useState(false);
  const [walletMismatch, setWalletMismatch] = useState(false);
  const [verificationReason, setVerificationReason] = useState<'sign-in' | 'inactivity'>('sign-in');
  // Track if we disconnected the wallet for sign-in verification
  const [disconnectedForVerification, setDisconnectedForVerification] = useState(false);
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
    // Only check for logged-in users with a linked wallet
    if (!user || !linkedWalletAddress) return;

    const now = Date.now();
    const lastActivity = lastActivityRef.current;
    const elapsed = now - lastActivity;

    if (elapsed >= INACTIVITY_TIMEOUT) {
      setNeedsVerification(true);
    }
  }, [user, linkedWalletAddress]);

  // On mount: check if user needs sign-in verification or inactivity re-verification
  useEffect(() => {
    if (!user || !linkedWalletAddress) return;

    // Check 1: Has user verified wallet this session?
    if (!isSessionVerified()) {
      setNeedsVerification(true);
      setVerificationReason('sign-in');
      // Disconnect wallet so user must freshly reconnect to verify
      if (isConnected && !disconnectedForVerification) {
        disconnect();
        setDisconnectedForVerification(true);
      }
      return;
    }

    // Check 2: Has inactivity timeout expired?
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const storedTime = parseInt(stored, 10);
        if (!isNaN(storedTime)) {
          lastActivityRef.current = storedTime;
          const elapsed = Date.now() - storedTime;
          if (elapsed >= INACTIVITY_TIMEOUT) {
            setNeedsVerification(true);
            setVerificationReason('inactivity');
          }
        }
      }
    } catch {
      // Ignore
    }
  }, [user, linkedWalletAddress, isSessionVerified, isConnected, disconnect, disconnectedForVerification]);

  // Track user activity events
  useEffect(() => {
    if (!user || !linkedWalletAddress) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    
    // Throttle activity updates (max once per 10 seconds)
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const throttledUpdate = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        if (!needsVerification) {
          updateActivity();
        }
      }, 10000);
    };

    events.forEach(event => window.addEventListener(event, throttledUpdate, { passive: true }));

    // Set up periodic inactivity check
    checkIntervalRef.current = setInterval(checkInactivity, ACTIVITY_CHECK_INTERVAL);

    // Initial activity timestamp
    updateActivity();

    return () => {
      events.forEach(event => window.removeEventListener(event, throttledUpdate));
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user, linkedWalletAddress, needsVerification, updateActivity, checkInactivity]);

  // When user connects wallet during verification, check if it matches
  useEffect(() => {
    if (!needsVerification || !isConnected || !address || !linkedWalletAddress) return;

    const normalizedConnected = address.toLowerCase();
    const normalizedLinked = linkedWalletAddress.toLowerCase();

    if (normalizedConnected === normalizedLinked) {
      // Correct wallet - verification passed
      setNeedsVerification(false);
      setWalletMismatch(false);
      markSessionVerified();
      updateActivity();
    } else {
      // Wrong wallet connected
      setWalletMismatch(true);
    }
  }, [needsVerification, isConnected, address, linkedWalletAddress, updateActivity, markSessionVerified]);

  // Don't render anything if:
  // - No user logged in
  // - No linked wallet (first-time user, handled elsewhere)
  // - Still loading wallet info
  // - No verification needed
  if (!user || !linkedWalletAddress || isLoadingLinkedWallet || !needsVerification) {
    return null;
  }

  // Show verification overlay
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {verificationReason === 'sign-in' ? 'Wallet Verification' : 'Session Verification Required'}
          </CardTitle>
          <CardDescription>
            {verificationReason === 'sign-in'
              ? 'Please verify your identity by connecting your linked wallet.'
              : "You've been inactive for a while. Please verify your identity by connecting your wallet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {walletMismatch && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Wrong wallet connected. Please connect the wallet linked to your account: 
                <span className="font-mono ml-1">
                  {linkedWalletAddress.slice(0, 6)}...{linkedWalletAddress.slice(-4)}
                </span>
              </span>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            Connect your linked wallet to continue:
            <span className="block font-mono mt-1 text-foreground">
              {linkedWalletAddress.slice(0, 6)}...{linkedWalletAddress.slice(-4)}
            </span>
          </div>

          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
