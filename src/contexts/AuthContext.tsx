import React, { useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isAllowedEmailDomain, EMAIL_DOMAIN_ERROR_MESSAGE } from '@/lib/emailValidation';
import { toast } from 'sonner';
import { AuthContext } from './AuthContextDefinition';

// Re-export the type for consumers
export type { AuthContextType } from './AuthContextDefinition';

// Helper function to process referral code after signup with retry logic
async function processReferralCode(userId: string, retryCount = 0): Promise<void> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1500; // 1.5 seconds

  try {
    // Check both localStorage and sessionStorage for referral code
    let referralCode = localStorage.getItem('referral_code');
    if (!referralCode) {
      referralCode = sessionStorage.getItem('referral_code');
    }
    
    if (!referralCode) {
      console.log('[Referral] No referral code found in storage');
      return;
    }
    
    console.log(`[Referral] Processing code: ${referralCode} for user: ${userId} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

    // Check if user's profile exists yet
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.log('[Referral] Profile not found yet, will retry...');
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => processReferralCode(userId, retryCount + 1), RETRY_DELAY);
      } else {
        console.error('[Referral] Max retries reached, profile not found');
      }
      return;
    }

    if (profile.referred_by) {
      console.log('[Referral] User already has a referrer:', profile.referred_by);
      localStorage.removeItem('referral_code');
      sessionStorage.removeItem('referral_code');
      return;
    }

    // Use secure database function for referral lookup (bypasses RLS)
    const { data: referrerData, error: referrerError } = await supabase
      .rpc('lookup_referrer_by_code', { code: referralCode });

    if (referrerError) {
      console.error('[Referral] Error looking up referral code:', referrerError);
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => processReferralCode(userId, retryCount + 1), RETRY_DELAY);
      } else {
        localStorage.removeItem('referral_code');
        sessionStorage.removeItem('referral_code');
      }
      return;
    }

    if (!referrerData || referrerData.length === 0) {
      console.log('[Referral] Referral code not found:', referralCode);
      localStorage.removeItem('referral_code');
      sessionStorage.removeItem('referral_code');
      return;
    }

    const referrerId = referrerData[0].user_id;
    console.log('[Referral] Found referrer:', referrerId);

    // Prevent self-referral
    if (referrerId === userId) {
      console.log('[Referral] Cannot refer yourself');
      localStorage.removeItem('referral_code');
      sessionStorage.removeItem('referral_code');
      return;
    }

    // Check if referral already exists (prevent duplicates)
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', userId)
      .maybeSingle();

    if (existingReferral) {
      console.log('[Referral] Referral already exists, skipping');
      localStorage.removeItem('referral_code');
      sessionStorage.removeItem('referral_code');
      return;
    }

    // Create pending referral record
    console.log('[Referral] Creating referral record...');
    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_id: userId,
        status: 'pending',
        bonus_granted: false,
      });

    if (referralError) {
      console.error('[Referral] Failed to create referral:', referralError);
      // Check if it's a duplicate constraint violation
      if (referralError.code === '23505') {
        console.log('[Referral] Duplicate referral detected - user already has a referrer');
        localStorage.removeItem('referral_code');
        sessionStorage.removeItem('referral_code');
        return;
      }
      toast.error('Failed to process referral. Please contact support.');
      return;
    }

    // Update profile with referred_by code
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ referred_by: referralCode })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Referral] Failed to update profile with referrer:', updateError);
    } else {
      console.log('[Referral] ✅ Referral recorded successfully:', referralCode);
      toast.success('Referral link applied! Connect your wallet to activate.');
    }
    
    // Clear storage only on success
    localStorage.removeItem('referral_code');
    sessionStorage.removeItem('referral_code');
  } catch (err) {
    console.error('[Referral] Error processing referral code:', err);
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => processReferralCode(userId, retryCount + 1), RETRY_DELAY);
    } else {
      toast.error('Failed to process referral code. Please try again later.');
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const processedUsersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Validate email domain for Gmail-only access
        if (session?.user?.email && !isAllowedEmailDomain(session.user.email)) {
          // Blocked domain - sign out immediately
          setTimeout(() => {
            supabase.auth.signOut();
            toast.error(EMAIL_DOMAIN_ERROR_MESSAGE);
          }, 0);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Process referral code for new users (on SIGNED_IN event)
        if (event === 'SIGNED_IN' && session?.user?.id) {
          const userId = session.user.id;
          // Only process once per user per session
          if (!processedUsersRef.current.has(userId)) {
            processedUsersRef.current.add(userId);
            // Use setTimeout to avoid blocking auth flow
            setTimeout(() => {
              processReferralCode(userId);
            }, 1000);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Validate email domain for Gmail-only access
      if (session?.user?.email && !isAllowedEmailDomain(session.user.email)) {
        // Blocked domain - sign out immediately
        supabase.auth.signOut();
        toast.error(EMAIL_DOMAIN_ERROR_MESSAGE);
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    // Use current origin for redirect - stays on the same domain after OAuth
    // Redirect directly to dashboard after successful login
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: 'select_account', // Force account selection screen
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
