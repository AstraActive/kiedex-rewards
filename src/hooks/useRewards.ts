import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

// Daily pool size - configurable in system_config table after migration
// To change: UPDATE system_config SET value = '15000' WHERE key = 'daily_pool_kdx';
const DAILY_POOL = 10000; // 10,000 KDX daily pool

export interface RewardClaim {
  id: string;
  user_id: string;
  amount: number;
  volume_score: number;
  claim_date: string;
  claimed_at: string;
  wallet_address?: string;
}

export interface DailyRewardSnapshot {
  id: string;
  user_id: string;
  reward_date: string;
  volume_score: number;
  total_pool_volume: number;
  reward_amount: number;
  is_claimed: boolean;
  claimed_at?: string;
  expires_at?: string; // NEW: expiry timestamp
  created_at: string;
}

export function useRewards() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  
  const today = new Date().toISOString().split('T')[0];

  // Get claimable snapshot (unclaimed AND not expired)
  const { data: claimableSnapshot, isLoading: snapshotLoading } = useQuery({
    queryKey: ['claimable_snapshot', user?.id, today], // Re-fetch daily
    queryFn: async () => {
      if (!user?.id) return null;
      
      const now = new Date().toISOString(); // Fresh timestamp on every fetch
      
      // Fetch the most recent unclaimed snapshot that hasn't expired
      const { data, error } = await supabase
        .from('daily_rewards_snapshot')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_claimed', false)
        .gt('expires_at', now) // Only get non-expired rewards
        .order('reward_date', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid error when no data
      
      if (error) throw error;
      return data as DailyRewardSnapshot | null;
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes cache
    refetchInterval: 60_000, // Refetch every minute to update expiry status
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

  // Get user's TODAY's volume from leaderboard for estimated rewards (live preview)
  const { data: todayStats } = useQuery({
    queryKey: ['today_stats', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('leaderboard_daily')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds - volume updates more frequently
    gcTime: 60_000, // 1 minute cache
  });

  // Get total counted volume for TODAY to calculate estimated share
  const { data: totalVolumeToday } = useQuery({
    queryKey: ['total_volume', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard_daily')
        .select('total_counted_volume')
        .eq('date', today);
      
      if (error) throw error;
      return (data || []).reduce((sum, entry) => sum + (entry.total_counted_volume || 0), 0);
    },
    staleTime: 30_000, // 30 seconds
    gcTime: 60_000, // 1 minute cache
  });

  // Calculate ESTIMATED rewards (today's live preview - not claimable yet)
  const userVolumeToday = todayStats?.total_counted_volume || 0;
  const userRawVolumeToday = todayStats?.total_volume || 0;
  const poolTotalToday = totalVolumeToday || 0;
  const userShareToday = poolTotalToday > 0 ? userVolumeToday / poolTotalToday : 0;
  const estimatedRewards = userShareToday * DAILY_POOL;

  // CLAIMABLE rewards (from snapshot, with expiry check)
  const claimableRewards = claimableSnapshot?.reward_amount || 0;
  const claimableDate = claimableSnapshot?.reward_date || null;
  const expiresAt = claimableSnapshot?.expires_at || null;
  const hasClaimableRewards = claimableRewards > 0 && !claimableSnapshot?.is_claimed;

  // Calculate time remaining until expiry
  const getTimeRemaining = () => {
    if (!expiresAt) return null;
    const expiryTime = new Date(expiresAt).getTime();
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
      if (!claimableSnapshot) throw new Error('No rewards to claim');
      if (claimableSnapshot.is_claimed) throw new Error('Already claimed');
      if (claimableRewards <= 0) throw new Error('No rewards to claim');

      const walletAddress = profile?.linked_wallet_address || null;

      // Use atomic RPC function - all operations in one transaction
      const { data, error } = await supabase.rpc('claim_reward', {
        p_snapshot_id: claimableSnapshot.id,
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
      queryClient.invalidateQueries({ queryKey: ['claimable_snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['rewards_history'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['referral_bonus_history'] });
      queryClient.invalidateQueries({ queryKey: ['referral_bonus_total'] });
    },
  });

  return {
    dailyPool: DAILY_POOL,
    // Today's estimated (live preview)
    userVolumeToday,
    userRawVolumeToday,
    totalVolumeToday: poolTotalToday,
    userShareToday,
    estimatedRewards,
    // Claimable (from snapshot with 24h expiry)
    claimableRewards,
    claimableDate,
    hasClaimableRewards,
    claimableSnapshot,
    expiresAt, // NEW: expiry timestamp
    getTimeRemaining, // NEW: helper function for countdown
    // Claim action
    claim: claimMutation.mutate,
    isClaiming: claimMutation.isPending,
    claimError: claimMutation.error,
    // History
    claimHistory: claimHistory || [],
    isLoading: snapshotLoading || historyLoading,
  };
}
