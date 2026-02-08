import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

// Daily pool size - configurable in system_config table after migration
// To change: UPDATE system_config SET value = '15000' WHERE key = 'daily_pool_kdx';
const DAILY_POOL = 10000; // 10,000 KDX daily pool
const REWARD_RESET_HOUR_UTC = 5; // Daily reset at 05:00 UTC

export interface RewardClaim {
  id: string;
  user_id: string;
  amount: number;
  volume_score: number;
  claim_date: string;
  claimed_at: string;
  wallet_address?: string;
}

/**
 * Get the claimable reward period date.
 * 
 * Reward Period Logic:
 * - Period "Day D": Day D 05:00 UTC → Day D+1 04:59:59 UTC
 * - Claimable: Day D+1 at 05:00 UTC onwards
 * 
 * Examples:
 * - Current time: Feb 9 10:00 UTC → Can claim period "Feb 8" (Feb 8 05:00 - Feb 9 04:59)
 * - Current time: Feb 9 02:00 UTC → Can claim period "Feb 7" (Feb 7 05:00 - Feb 8 04:59)
 */
const getClaimablePeriodDate = (): string => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  // If before 05:00 UTC, claimable period is 2 days ago
  // (yesterday's period hasn't closed yet)
  if (utcHour < REWARD_RESET_HOUR_UTC) {
    const claimDate = new Date(now);
    claimDate.setUTCDate(claimDate.getUTCDate() - 2);
    return claimDate.toISOString().split('T')[0];
  }
  
  // If 05:00 UTC or later, yesterday's period just closed and is claimable
  const claimDate = new Date(now);
  claimDate.setUTCDate(claimDate.getUTCDate() - 1);
  return claimDate.toISOString().split('T')[0];
};

/**
 * Get the current active reward period date (for estimated rewards).
 * This is the period where trading currently counts toward.
 */
const getCurrentPeriodDate = (): string => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  // If before 05:00 UTC, still in yesterday's period
  if (utcHour < REWARD_RESET_HOUR_UTC) {
    const periodDate = new Date(now);
    periodDate.setUTCDate(periodDate.getUTCDate() - 1);
    return periodDate.toISOString().split('T')[0];
  }
  
  // If 05:00 UTC or later, in today's period
  return now.toISOString().split('T')[0];
};

/**
 * Check if currently within claim window (always after reset).
 * Claims are available right after the 05:00 UTC reset.
 */
const isWithinClaimWindow = (): boolean => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  // After 05:00 UTC, new claims become available
  return utcHour >= REWARD_RESET_HOUR_UTC;
};

/**
 * Get the expiry time for current claimable rewards.
 * Rewards expire at the next reset (04:59:59 UTC tomorrow).
 */
const getExpiryTime = (): Date => {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  const expiry = new Date(now);
  
  // If before 05:00 UTC, expiry is today at 04:59:59
  if (utcHour < REWARD_RESET_HOUR_UTC) {
    expiry.setUTCHours(4, 59, 59, 999);
  } else {
    // If after 05:00 UTC, expiry is tomorrow at 04:59:59
    expiry.setUTCDate(expiry.getUTCDate() + 1);
    expiry.setUTCHours(4, 59, 59, 999);
  }
  
  return expiry;
};

export function useRewards() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  
  const currentPeriod = getCurrentPeriodDate();
  const claimablePeriod = getClaimablePeriodDate();

  // Get claimable period's leaderboard data for rewards
  const { data: claimableStats, isLoading: claimableLoading } = useQuery({
    queryKey: ['claimable_stats', user?.id, claimablePeriod],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('leaderboard_daily')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', claimablePeriod)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes cache
  });

  // Get total volume for claimable period to calculate share
  const { data: totalVolumeClaimable } = useQuery({
    queryKey: ['total_volume_claimable', claimablePeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard_daily')
        .select('total_counted_volume')
        .eq('date', claimablePeriod);
      
      if (error) throw error;
      return (data || []).reduce((sum, entry) => sum + (entry.total_counted_volume || 0), 0);
    },
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes cache
  });

  // Check if already claimed this period's rewards
  const { data: alreadyClaimed } = useQuery({
    queryKey: ['reward_claimed', user?.id, claimablePeriod],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('rewards_claims')
        .select('id')
        .eq('user_id', user.id)
        .eq('claim_date', claimablePeriod)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes cache
  });

  // Get claim history from rewards_claims
  const { data: claimHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['rewards_history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('rewards_claims')
        .select('*')
        .eq('user_id', user.id)
        .order('claim_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data as RewardClaim[];
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes cache
  });

  // Get user's CURRENT PERIOD volume from leaderboard for estimated rewards (live preview)
  const { data: currentStats } = useQuery({
    queryKey: ['current_stats', user?.id, currentPeriod],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('leaderboard_daily')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', currentPeriod)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds - volume updates more frequently
    gcTime: 60_000, // 1 minute cache
  });

  // Get total counted volume for CURRENT PERIOD to calculate estimated share
  const { data: totalVolumeCurrent } = useQuery({
    queryKey: ['total_volume_current', currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard_daily')
        .select('total_counted_volume')
        .eq('date', currentPeriod);
      
      if (error) throw error;
      return (data || []).reduce((sum, entry) => sum + (entry.total_counted_volume || 0), 0);
    },
    staleTime: 30_000, // 30 seconds
    gcTime: 60_000, // 1 minute cache
  });

  // Calculate ESTIMATED rewards (current period live preview - not claimable yet)
  const userVolumeCurrent = currentStats?.total_counted_volume || 0;
  const userRawVolumeCurrent = currentStats?.total_volume || 0;
  const poolTotalCurrent = totalVolumeCurrent || 0;
  const userShareCurrent = poolTotalCurrent > 0 ? userVolumeCurrent / poolTotalCurrent : 0;
  const estimatedRewards = userShareCurrent * DAILY_POOL;

  // Calculate CLAIMABLE rewards (completed period, after 05:00 UTC)
  const userVolumeClaimable = claimableStats?.total_counted_volume || 0;
  const poolTotalClaimable = totalVolumeClaimable || 0;
  const userShareClaimable = poolTotalClaimable > 0 ? userVolumeClaimable / poolTotalClaimable : 0;
  const claimableRewards = userShareClaimable * DAILY_POOL;
  
  const withinClaimWindow = isWithinClaimWindow();
  const expiresAt = getExpiryTime();
  const hasClaimableRewards = 
    claimableRewards > 0 && 
    !alreadyClaimed && 
    withinClaimWindow;

  // Calculate time remaining until expiry
  const getTimeRemaining = () => {
    const expiryTime = expiresAt.getTime();
    const nowTime = Date.now();
    const remaining = expiryTime - nowTime;
    if (remaining <= 0) return null;
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, totalMs: remaining };
  };

  // Claim rewards mutation - uses atomic RPC for transaction safety
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!hasClaimableRewards) throw new Error('No rewards to claim');
      if (alreadyClaimed) throw new Error('Already claimed');
      if (claimableRewards <= 0) throw new Error('No rewards to claim');
      if (!withinClaimWindow) throw new Error('Not within claim window');

      const walletAddress = profile?.linked_wallet_address || null;

      // Use atomic RPC function - all operations in one transaction
      const { data, error } = await supabase.rpc('claim_reward', {
        p_claim_date: claimablePeriod,
        p_user_id: user.id,
        p_wallet_address: walletAddress,
      }) as { data: Array<{
        success: boolean;
        claim_id: string;
        reward_amount: number;
        new_kdx_balance: number;
        message: string;
      }> | null; error: unknown };

      if (error) {
        console.error('Claim RPC error:', error);
        throw new Error('Failed to claim reward');
      }

      if (!data || data.length === 0) {
        throw new Error('No response from claim function');
      }

      const result = data[0];
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to claim reward');
      }

      console.log(`Reward claimed: ${result.reward_amount} KDX, new balance: ${result.new_kdx_balance}`);

      // Process 8% referral bonus via edge function (bypasses RLS for cross-user updates)
      try {
        console.log('[Rewards] Calling process-referral-bonus edge function...');
        const { data: refData, error: refError } = await supabase.functions.invoke('process-referral-bonus', {
          body: { 
            claimId: result.claim_id, 
            claimedAmount: result.reward_amount 
          }
        });
        
        if (refError) {
          console.error('[Rewards] Referral bonus processing failed:', refError);
        } else if (refData?.success) {
          console.log(`[Rewards] Referral bonus paid: ${refData.bonusAmount} KDX to ${refData.referrerId}`);
        } else {
          console.log('[Rewards] Referral bonus not processed:', refData?.message || 'No active referral');
        }
      } catch (refErr) {
        // Log but don't fail the claim if referral bonus fails
        console.error('[Rewards] Failed to call referral bonus function:', refErr);
      }

      return { 
        amount: result.reward_amount, 
        newBalance: result.new_kdx_balance 
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claimable_stats'] });
      queryClient.invalidateQueries({ queryKey: ['reward_claimed'] });
      queryClient.invalidateQueries({ queryKey: ['rewards_history'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['referral_bonus_history'] });
      queryClient.invalidateQueries({ queryKey: ['referral_bonus_total'] });
    },
  });

  return {
    dailyPool: DAILY_POOL,
    // Current period estimated (live preview)
    userVolumeToday: userVolumeCurrent,
    userRawVolumeToday: userRawVolumeCurrent,
    totalVolumeToday: poolTotalCurrent,
    userShareToday: userShareCurrent,
    estimatedRewards,
    // Claimable (completed period, after 05:00 UTC)
    claimableRewards,
    claimableDate: claimablePeriod,
    hasClaimableRewards,
    expiresAt: expiresAt.toISOString(),
    getTimeRemaining,
    // Claim action
    claim: claimMutation.mutate,
    isClaiming: claimMutation.isPending,
    claimError: claimMutation.error,
    // History
    claimHistory: claimHistory || [],
    isLoading: claimableLoading || historyLoading,
  };
}
