import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from './useProfile';
import { PRODUCTION_URL } from '@/config/urls';

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  bonus_granted: boolean;
  status: 'pending' | 'active';
  activated_at: string | null;
  created_at: string;
}

export interface ReferralBonusHistoryItem {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  claim_id: string;
  claimed_amount: number;
  referral_bonus_amount: number;
  created_at: string;
}

export function useReferrals() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  // Get referrals made by this user
  const { data: referrals, isLoading: referralsLoading } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute - referrals don't change often
    gcTime: 10 * 60_000, // 10 minutes cache
  });

  // Get total referral bonus earned
  const { data: totalBonusEarned, isLoading: bonusTotalLoading } = useQuery({
    queryKey: ['referral_bonus_total', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await supabase
        .from('referral_bonus_history')
        .select('referral_bonus_amount')
        .eq('referrer_user_id', user.id);
      
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + (r.referral_bonus_amount || 0), 0);
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
    gcTime: 10 * 60_000, // 10 minutes cache
  });

  // Get last 10 bonus payouts
  const { data: bonusHistory, isLoading: bonusHistoryLoading } = useQuery({
    queryKey: ['referral_bonus_history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('referral_bonus_history')
        .select('*')
        .eq('referrer_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as ReferralBonusHistoryItem[];
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
    gcTime: 10 * 60_000, // 10 minutes cache
  });

  const referralCode = profile?.referral_code || '';
  // Always use production URL for referral links
  const referralLink = referralCode 
    ? `${PRODUCTION_URL}?ref=${referralCode}` 
    : '';
  
  const totalReferrals = referrals?.length || 0;
  const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;
  const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;
  
  // Legacy field - count of referrals where bonus_granted is true
  const bonusGranted = referrals?.filter(r => r.bonus_granted).length || 0;

  const isLoading = referralsLoading || bonusTotalLoading || bonusHistoryLoading;

  return {
    referralCode,
    referralLink,
    referrals: referrals || [],
    totalReferrals,
    pendingReferrals,
    activeReferrals,
    bonusGranted,
    totalBonusEarned: totalBonusEarned || 0,
    bonusHistory: bonusHistory || [],
    isLoading,
  };
}
