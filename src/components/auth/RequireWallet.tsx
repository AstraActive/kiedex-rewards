import { useWallet } from '@/hooks/useWallet';
import { ConnectWalletScreen } from '@/components/wallet/ConnectWalletScreen';
import { useState, useEffect, useRef } from 'react';
import { isWalletSessionValid, setWalletVerified, updateWalletActivity } from '@/lib/walletSession';
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
  
  // Track if wallet has been verified this session
  const [sessionVerified, setSessionVerified] = useState<boolean | null>(null);
  const lastAddressRef = useRef<string | null>(null);
  
  // Add a small delay before showing connect screen to prevent flash during tab switches
  const [showConnectScreen, setShowConnectScreen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log(`[RequireWallet ${pageName}] State:`, {
      address,
      isConnected,
      isReconnecting,
      walletSaved,
      sessionVerified,
      isLoadingLinkedWallet,
      linkedWalletAddress: linkedWalletAddress ? '0x...' + linkedWalletAddress.slice(-4) : null,
    });
  }, [pageName, address, isConnected, isReconnecting, walletSaved, sessionVerified, isLoadingLinkedWallet, linkedWalletAddress]);

  // Initialize session check on first render
  useEffect(() => {
    if (address && sessionVerified === null) {
      // Check if there's a valid session in localStorage
      const isValid = isWalletSessionValid(address);
      setSessionVerified(isValid);
    }
  }, [address, sessionVerified]);
  
  // Check and set session validity - only when stable conditions are met
  useEffect(() => {
    // Skip if still loading or wallet state is unstable
    if (isLoadingLinkedWallet || isReconnecting) {
      return;
    }

    // If address changed, clear previous session
    if (address && lastAddressRef.current && address !== lastAddressRef.current) {
      setSessionVerified(false);
      lastAddressRef.current = address;
      return;
    }

    // If we have a stable connected and saved wallet
    if (address && isConnected && walletSaved && !walletMismatch) {
      lastAddressRef.current = address;
      
      // Check if session is already valid
      const isValid = isWalletSessionValid(address);
      
      if (isValid) {
        // Session exists and is valid
        if (sessionVerified !== true) {
          setSessionVerified(true);
        }
      } else {
        // No valid session, create new one
        setWalletVerified(address);
        if (sessionVerified !== true) {
          setSessionVerified(true);
        }
      }
    } else if (!isConnected || walletMismatch) {
      // Only clear session if actually disconnected or there's a mismatch
      if (sessionVerified !== false) {
        setSessionVerified(false);
      }
      lastAddressRef.current = null;
    }
    // Don't clear session just because walletSaved is temporarily false during loading
  }, [address, isConnected, walletSaved, walletMismatch, isLoadingLinkedWallet, isReconnecting, sessionVerified]);
  
  // Update activity on any interaction to keep session alive
  useEffect(() => {
    if (sessionVerified === true && address) {
      const updateActivity = () => updateWalletActivity(address);
      
      // Update on mouse move, key press, or touch
      window.addEventListener('mousemove', updateActivity);
      window.addEventListener('keydown', updateActivity);
      window.addEventListener('touchstart', updateActivity);
      window.addEventListener('click', updateActivity);
      
      return () => {
        window.removeEventListener('mousemove', updateActivity);
        window.removeEventListener('keydown', updateActivity);
        window.removeEventListener('touchstart', updateActivity);
        window.removeEventListener('click', updateActivity);
      };
    }
  }, [sessionVerified, address]);
  
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

  // Block if connected but wallet not verified yet OR session expired
  // This covers the brief moment between connecting and verifying, or when session expires
  if (!walletSaved && linkedWalletAddress) {
    // User has a linked wallet but hasn't verified connection yet
    return <ConnectWalletScreen pageName={pageName} />;
  }

  // Block if no linked wallet and not yet saved
  // This is for first-time users who need to link
  if (!walletSaved && !linkedWalletAddress) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  // Block if session has expired - require re-verification
  // Don't block if session check is still pending (null) or if still loading wallet state
  if (isConnected && walletSaved && sessionVerified === false && !isLoadingLinkedWallet) {
    return <ConnectWalletScreen pageName={pageName} />;
  }

  return <>{children}</>;
}
