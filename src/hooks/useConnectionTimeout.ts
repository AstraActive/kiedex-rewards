import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { clearWalletStorage } from '@/lib/walletStorage';

const CONNECTION_TIMEOUT_MS = 10000; // 10 seconds

interface UseConnectionTimeoutReturn {
  isConnecting: boolean;
  hasTimedOut: boolean;
  failureCount: number;
  startConnection: () => void;
  cancelConnection: () => void;
  retryConnection: () => void;
  resetAndClearCache: () => void;
}

export function useConnectionTimeout(): UseConnectionTimeoutReturn {
  const { isConnecting: wagmiConnecting, isConnected } = useAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startConnection = useCallback(() => {
    setIsConnecting(true);
    setHasTimedOut(false);
    clearTimeoutRef();
    
    timeoutRef.current = setTimeout(() => {
      if (!isConnected) {
        setHasTimedOut(true);
        setFailureCount(prev => prev + 1);
        // Clear only WalletConnect sessions on timeout, but preserve wagmi store
        // so it doesn't ask to reconnect again
        console.log('Connection timeout - clearing stale WalletConnect sessions');
        clearWalletStorage(false); // false = don't clear persistent keys
      }
    }, CONNECTION_TIMEOUT_MS);
  }, [clearTimeoutRef, isConnected]);

  const cancelConnection = useCallback(() => {
    setIsConnecting(false);
    setHasTimedOut(false);
    clearTimeoutRef();
    // Don't clear wagmi store on cancel - user might just be navigating away
    // Only clear WalletConnect sessions to prevent stuck states
    clearWalletStorage(false); // false = preserve persistent connection state
  }, [clearTimeoutRef]);

  const retryConnection = useCallback(() => {
    setHasTimedOut(false);
    startConnection();
  }, [startConnection]);

  const resetAndClearCache = useCallback(() => {
    setIsConnecting(false);
    setHasTimedOut(false);
    setFailureCount(0);
    clearTimeoutRef();
    clearWalletStorage(true); // true = full reset including persistent state
    console.log('Wallet cache cleared and connection reset');
  }, [clearTimeoutRef]);

  // Auto-cancel when connected
  useEffect(() => {
    if (isConnected) {
      setIsConnecting(false);
      setHasTimedOut(false);
      setFailureCount(0);
      clearTimeoutRef();
    }
  }, [isConnected, clearTimeoutRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeoutRef();
  }, [clearTimeoutRef]);

  return {
    isConnecting: isConnecting || wagmiConnecting,
    hasTimedOut,
    failureCount,
    startConnection,
    cancelConnection,
    retryConnection,
    resetAndClearCache,
  };
}
