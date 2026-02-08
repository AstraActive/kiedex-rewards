import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAccount, useChainId, useSwitchChain, useDisconnect } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BASE_CHAIN_ID } from '@/config/wagmi';
import { useToast } from '@/hooks/use-toast';
import { clearWalletStorage, clearKiedexWalletSession } from '@/lib/walletStorage';
import { WalletContext } from './WalletContextDefinition';

// Re-export the type for consumers
export type { WalletContextType } from './WalletContextDefinition';

// SessionStorage key helper
const getWalletLinkedKey = (userId: string) => `kiedex_wallet_linked_${userId}`;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { address, isConnected, isReconnecting } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  
  const [walletSaved, setWalletSaved] = useState(false);
  const [linkedWalletAddress, setLinkedWalletAddress] = useState<string | null>(null);
  const [walletMismatch, setWalletMismatch] = useState(false);
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [walletLinkError, setWalletLinkError] = useState<string | null>(null);
  const [isLoadingLinkedWallet, setIsLoadingLinkedWallet] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  // Ref to prevent multiple linking attempts in a single session
  const hasLinkedThisSessionRef = useRef(false);
  // Ref to track the address we last processed to avoid re-processing
  const lastProcessedAddressRef = useRef<string | null>(null);

  const isWrongNetwork = isConnected && chainId !== BASE_CHAIN_ID;
  const isWalletRequired = !!user && !isConnected;

  // Check if wallet was already linked in sessionStorage
  const isAlreadyLinkedInSession = useCallback((userId: string) => {
    try {
      return sessionStorage.getItem(getWalletLinkedKey(userId)) === '1';
    } catch {
      return false;
    }
  }, []);

  // Mark wallet as linked in sessionStorage
  const markLinkedInSession = useCallback((userId: string) => {
    try {
      sessionStorage.setItem(getWalletLinkedKey(userId), '1');
    } catch {
      // Ignore sessionStorage errors
    }
  }, []);

  // Reset all wallet connection state and storage
  const resetWalletConnection = useCallback(() => {
    // Disconnect wagmi
    disconnect();
    
    // Clear all wallet storage including persistent state (full reset)
    clearWalletStorage(true);
    
    // Clear KieDex session
    if (user?.id) {
      clearKiedexWalletSession(user.id);
    }
    
    // Reset all states
    setWalletSaved(false);
    setWalletMismatch(false);
    setWalletLinkError(null);
    hasLinkedThisSessionRef.current = false;
    lastProcessedAddressRef.current = null;
    
    toast({
      title: 'Wallet Reset',
      description: 'Wallet connection has been reset. You can now reconnect.',
    });
  }, [disconnect, user?.id, toast]);

  // Reset states when user changes
  useEffect(() => {
    hasLinkedThisSessionRef.current = false;
    lastProcessedAddressRef.current = null;
    setProfileLoaded(false);
  }, [user?.id]);

  // Fetch linked wallet on mount or when user changes
  useEffect(() => {
    const fetchLinkedWallet = async () => {
      if (!user) {
        setLinkedWalletAddress(null);
        setIsLoadingLinkedWallet(false);
        setProfileLoaded(false);
        return;
      }

      setIsLoadingLinkedWallet(true);
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('linked_wallet_address')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching linked wallet:', error);
        }
        
        const walletAddr = profile?.linked_wallet_address ?? null;
        setLinkedWalletAddress(walletAddr);
        
        // If wallet exists, mark in session to prevent future linking attempts
        if (walletAddr) {
          markLinkedInSession(user.id);
        }
      } catch (err) {
        console.error('Failed to fetch linked wallet:', err);
      } finally {
        setIsLoadingLinkedWallet(false);
        setProfileLoaded(true);
      }
    };

    fetchLinkedWallet();
  }, [user, markLinkedInSession]);

  // Handle wallet connection and linking
  useEffect(() => {
    const handleWalletConnection = async () => {
      // Reset states when disconnected
      if (!isConnected || !address) {
        setWalletSaved(false);
        setWalletMismatch(false);
        setWalletLinkError(null);
        lastProcessedAddressRef.current = null;
        return;
      }

      // CRITICAL: Wait for profile to be loaded before doing anything
      if (!user || !profileLoaded || isWrongNetwork) {
        return;
      }

      // Skip if we already processed this address
      if (lastProcessedAddressRef.current === address.toLowerCase()) {
        return;
      }

      const normalizedAddress = address.toLowerCase();
      const normalizedLinkedAddress = linkedWalletAddress?.toLowerCase();

      // Case 1: User already has a linked wallet - just verify match
      if (linkedWalletAddress) {
        lastProcessedAddressRef.current = normalizedAddress;
        
        if (normalizedAddress === normalizedLinkedAddress) {
          // Correct wallet connected - just set state, NO toast
          setWalletMismatch(false);
          setWalletLinkError(null);
          setWalletSaved(true);
          
          // Silently save to wallet_connections for compatibility (fire and forget)
          supabase
            .from('wallet_connections')
            .upsert({
              user_id: user.id,
              wallet_address: address,
              chain_id: chainId,
              is_primary: true,
            }, {
              onConflict: 'user_id,wallet_address',
            })
            .then(() => {});
        } else {
          // Wrong wallet connected
          setWalletMismatch(true);
          setWalletSaved(false);
          setWalletLinkError(null);
        }
        return;
      }

      // Case 2: First-time linking - no linked wallet yet
      // Guard 1: Check sessionStorage - if already linked this session, skip
      if (isAlreadyLinkedInSession(user.id)) {
        return;
      }

      // Guard 2: Only attempt linking once per component lifecycle
      if (hasLinkedThisSessionRef.current) {
        return;
      }

      hasLinkedThisSessionRef.current = true;
      lastProcessedAddressRef.current = normalizedAddress;
      setIsLinkingWallet(true);
      setWalletLinkError(null);

      try {
        // Check if this wallet is already linked to another account
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('linked_wallet_address', address)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking wallet:', checkError);
          setWalletLinkError('Failed to verify wallet. Please try again.');
          setIsLinkingWallet(false);
          hasLinkedThisSessionRef.current = false;
          return;
        }

        if (existingProfile && existingProfile.user_id !== user.id) {
          setWalletLinkError('This wallet is already linked to another account.');
          setIsLinkingWallet(false);
          toast({
            title: 'Wallet Already Linked',
            description: 'This wallet is already linked to another account. Please use a different wallet.',
            variant: 'destructive',
          });
          return;
        }

        // Link the wallet to this user's profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ linked_wallet_address: address })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error linking wallet:', updateError);
          setWalletLinkError('Failed to link wallet. Please try again.');
          setIsLinkingWallet(false);
          hasLinkedThisSessionRef.current = false;
          return;
        }

        // Verify the wallet was actually saved
        const { data: verifyProfile } = await supabase
          .from('profiles')
          .select('linked_wallet_address')
          .eq('user_id', user.id)
          .single();

        if (!verifyProfile?.linked_wallet_address) {
          console.error('Wallet link verification failed');
          setWalletLinkError('Failed to verify wallet link. Please try again.');
          setIsLinkingWallet(false);
          hasLinkedThisSessionRef.current = false;
          return;
        }

        // Successfully linked
        setLinkedWalletAddress(address);
        setWalletSaved(true);
        setWalletLinkError(null);
        
        // Mark as linked in sessionStorage
        markLinkedInSession(user.id);
        
        // Also save to wallet_connections for compatibility
        await supabase
          .from('wallet_connections')
          .upsert({
            user_id: user.id,
            wallet_address: address,
            chain_id: chainId,
            is_primary: true,
          }, {
            onConflict: 'user_id,wallet_address',
          });

        // Activate referral - update status from 'pending' to 'active'
        try {
          const { data: updatedReferral, error: referralError } = await supabase
            .from('referrals')
            .update({ 
              status: 'active', 
              activated_at: new Date().toISOString() 
            })
            .eq('referred_id', user.id)
            .eq('status', 'pending')
            .select();
          
          if (referralError) {
            console.error('[Referral] Failed to activate referral:', referralError);
            toast({
              title: 'Referral Activation Issue',
              description: 'Could not activate your referral. Please contact support.',
              variant: 'destructive',
            });
          } else if (updatedReferral && updatedReferral.length > 0) {
            console.log('[Referral] ✅ Referral activated successfully for user:', user.id);
            toast({
              title: 'Referral Activated!',
              description: 'Your referral is now active. Your referrer will earn bonuses when you claim rewards.',
            });
          } else {
            console.log('[Referral] No pending referral found for user:', user.id);
          }
        } catch (err) {
          console.error('[Referral] Error activating referral:', err);
        }

        // Show toast ONLY on first-time successful link
        toast({
          title: 'Wallet Linked',
          description: 'Your wallet has been permanently linked to this account.',
        });
      } catch (err) {
        console.error('Failed to link wallet:', err);
        setWalletLinkError('An error occurred. Please try again.');
        hasLinkedThisSessionRef.current = false;
      } finally {
        setIsLinkingWallet(false);
      }
    };

    handleWalletConnection();
  }, [user, isConnected, address, chainId, linkedWalletAddress, profileLoaded, isWrongNetwork, toast, isAlreadyLinkedInSession, markLinkedInSession]);

  const switchToBase = useCallback(() => {
    if (switchChain) {
      switchChain({ chainId: BASE_CHAIN_ID });
    }
  }, [switchChain]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    setWalletSaved(false);
    setWalletMismatch(false);
    setWalletLinkError(null);
    lastProcessedAddressRef.current = null;
  }, [disconnect]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        chainId,
        isWrongNetwork,
        isWalletRequired,
        switchToBase,
        walletSaved,
        linkedWalletAddress,
        walletMismatch,
        isLinkingWallet,
        walletLinkError,
        disconnectWallet,
        isLoadingLinkedWallet,
        resetWalletConnection,
        isReconnecting,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
