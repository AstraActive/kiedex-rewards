import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute
const SESSION_KEY = 'kiedex_last_activity';
const VERIFIED_SESSION_KEY = 'kiedex_wallet_verified';

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * InactivityVerification - Global component that:
 * 1. Requires wallet verification on every sign-in (once per session)
 * 2. Re-prompts after 30 minutes of inactivity
 */
export function InactivityVerification() {
  const { user, signOut } = useAuth();
  const { linkedWalletAddress, isLoadingLinkedWallet, disconnectWallet, resetWalletConnection } = useWallet();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [needsVerification, setNeedsVerification] = useState(false);
  const [walletMismatch, setWalletMismatch] = useState(false);
  const [verificationReason, setVerificationReason] = useState<'sign-in' | 'inactivity'>('sign-in');
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
      setNeedsVerification(true);
      setVerificationReason('inactivity');
      setWalletMismatch(false);
      hasDisconnectedRef.current = false;
    }
  }, [user, linkedWalletAddress]);

  // On mount / user change: check if sign-in verification needed
  useEffect(() => {
    if (!user || !linkedWalletAddress || isLoadingLinkedWallet) return;

    if (!isSessionVerified()) {
      setNeedsVerification(true);
      setVerificationReason('sign-in');
      setWalletMismatch(false);
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
              setNeedsVerification(true);
              setVerificationReason('inactivity');
              setWalletMismatch(false);
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

  // Clear mismatch when wallet disconnects so user can retry
  useEffect(() => {
    if (!isConnected && walletMismatch) {
      setWalletMismatch(false);
    }
  }, [isConnected, walletMismatch]);

  // When user connects wallet during verification, check if it matches
  useEffect(() => {
    if (!needsVerification || !isConnected || !address || !linkedWalletAddress) return;
    // Only verify after we've disconnected (user freshly reconnected)
    if (!hasDisconnectedRef.current) return;

    if (address.toLowerCase() === linkedWalletAddress.toLowerCase()) {
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

  // Wrong wallet connected - show mismatch screen
  if (walletMismatch && address) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Wrong Wallet Connected</CardTitle>
            <CardDescription>
              This account is linked to a different wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

  // Default: Connect saved wallet screen
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connect Your Saved Wallet</CardTitle>
          <CardDescription>
            {verificationReason === 'sign-in'
              ? 'This account is linked to a specific wallet'
              : "You've been inactive for a while. Please verify your identity."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted text-center">
            <p className="text-xs text-muted-foreground mb-2">Linked wallet address:</p>
            <p className="font-mono text-lg font-semibold text-primary">
              {formatAddress(linkedWalletAddress)}
            </p>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Please connect the same wallet to continue.
          </p>

          <div className="flex justify-center">
            <ConnectButton />
          </div>

          <Button variant="ghost" onClick={signOut} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
