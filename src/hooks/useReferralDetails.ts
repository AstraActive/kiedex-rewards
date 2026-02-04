import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from './useProfile';
import { PRODUCTION_URL } from '@/config/urls';

export interface ReferralUser {
  id: string;
  referrer_id: string;
  referred_id: string;
  bonus_granted: boolean;
  status: 'pending' | 'active';
  activated_at: string | null;
  created_at: string;
  wallet_address: string | null;
  total_volume: number;
  total_bonus_from_user: number;
}

export interface ReferralBonusHistoryItem {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  claim_id: string;
  claimed_amount: number;
  referral_bonus_amount: number;
  created_at: string;
  referred_wallet: string | null;
}

interface UseReferralDetailsOptions {
  usersPage: number;
  usersPageSize: number;
  historyPage: number;
  historyPageSize: number;
}

export function useReferralDetails({
  usersPage,
  usersPageSize,
  historyPage,
  historyPageSize,
}: UseReferralDetailsOptions) {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  // Get referrals with details
  const { data: referralsData, isLoading: referralsLoading } = useQuery({
    queryKey: ['referral_users_detailed', user?.id, usersPage, usersPageSize],
    queryFn: async () => {
      if (!user?.id) return { users: [], totalCount: 0, totalPages: 0 };

      // Get count first
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / usersPageSize);

      // Get paginated referrals
      const from = usersPage * usersPageSize;
      const to = from + usersPageSize - 1;

      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!referrals || referrals.length === 0) {
        return { users: [], totalCount, totalPages };
      }

      // Get profile info for each referral (wallet addresses)
      const referredIds = referrals.map(r => r.referred_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, linked_wallet_address')
        .in('user_id', referredIds);

      // Get total volume per referral from leaderboard
      const { data: leaderboardData } = await supabase
        .from('leaderboard_daily')
        .select('user_id, total_volume')
        .in('user_id', referredIds);

      // Calculate total volume per user
      const volumeByUser: Record<string, number> = {};
      (leaderboardData || []).forEach((entry) => {
        volumeByUser[entry.user_id] = (volumeByUser[entry.user_id] || 0) + entry.total_volume;
      });

      // Get total bonus earned from each referral
      const { data: bonusData } = await supabase
        .from('referral_bonus_history')
        .select('referred_user_id, referral_bonus_amount')
        .eq('referrer_user_id', user.id)
        .in('referred_user_id', referredIds);

      const bonusByUser: Record<string, number> = {};
      (bonusData || []).forEach((entry) => {
        bonusByUser[entry.referred_user_id] = (bonusByUser[entry.referred_user_id] || 0) + entry.referral_bonus_amount;
      });

      // Map profiles to users
      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p.linked_wallet_address])
      );

      const users: ReferralUser[] = referrals.map((ref) => ({
        ...ref,
        status: ref.status as 'pending' | 'active',
        wallet_address: profileMap.get(ref.referred_id) || null,
        total_volume: volumeByUser[ref.referred_id] || 0,
        total_bonus_from_user: bonusByUser[ref.referred_id] || 0,
      }));

      return { users, totalCount, totalPages };
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Get bonus history with pagination
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['referral_bonus_history_detailed', user?.id, historyPage, historyPageSize],
    queryFn: async () => {
      if (!user?.id) return { history: [], totalCount: 0, totalPages: 0 };

      // Get count first
      const { count } = await supabase
        .from('referral_bonus_history')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', user.id);

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / historyPageSize);

      // Get paginated history
      const from = historyPage * historyPageSize;
      const to = from + historyPageSize - 1;

      const { data: history, error } = await supabase
        .from('referral_bonus_history')
        .select('*')
        .eq('referrer_user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!history || history.length === 0) {
        return { history: [], totalCount, totalPages };
      }

      // Get wallet addresses for referred users
      const referredIds = history.map(h => h.referred_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, linked_wallet_address')
        .in('user_id', referredIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p.linked_wallet_address])
      );

      const historyWithWallets: ReferralBonusHistoryItem[] = history.map((h) => ({
        ...h,
        referred_wallet: profileMap.get(h.referred_user_id) || null,
      }));

      return { history: historyWithWallets, totalCount, totalPages };
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Get summary stats
  const { data: summaryStats } = useQuery({
    queryKey: ['referral_summary', user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalInvited: 0, activeCount: 0, pendingCount: 0, totalBonusEarned: 0 };

      // Get referrals count by status
      const { data: referrals } = await supabase
        .from('referrals')
        .select('status')
        .eq('referrer_id', user.id);

      const totalInvited = referrals?.length || 0;
      const activeCount = referrals?.filter(r => r.status === 'active').length || 0;
      const pendingCount = referrals?.filter(r => r.status === 'pending').length || 0;

      // Get total bonus earned
      const { data: bonusData } = await supabase
        .from('referral_bonus_history')
        .select('referral_bonus_amount')
        .eq('referrer_user_id', user.id);

      const totalBonusEarned = (bonusData || []).reduce(
        (sum, r) => sum + (r.referral_bonus_amount || 0),
        0
      );

      return { totalInvited, activeCount, pendingCount, totalBonusEarned };
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const referralCode = profile?.referral_code || '';
  const referralLink = referralCode ? `${PRODUCTION_URL}?ref=${referralCode}` : '';

  return {
    referralCode,
    referralLink,
    // Users data
    referralUsers: referralsData?.users || [],
    usersTotalCount: referralsData?.totalCount || 0,
    usersTotalPages: referralsData?.totalPages || 0,
    usersLoading: referralsLoading,
    // History data
    bonusHistory: historyData?.history || [],
    historyTotalCount: historyData?.totalCount || 0,
    historyTotalPages: historyData?.totalPages || 0,
    historyLoading: historyLoading,
    // Summary
    totalInvited: summaryStats?.totalInvited || 0,
    activeCount: summaryStats?.activeCount || 0,
    pendingCount: summaryStats?.pendingCount || 0,
    totalBonusEarned: summaryStats?.totalBonusEarned || 0,
  };
}
