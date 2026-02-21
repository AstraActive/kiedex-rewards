import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const DAILY_BONUS_AMOUNT = 40;
const COOLDOWN_HOURS = 24;

export function useDailyBonus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get last daily bonus claim
  const { data: lastClaim, isLoading } = useQuery({
    queryKey: ['daily_bonus', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('bonus_claims')
        .select('created_at, claim_date')
        .eq('user_id', user.id)
        .eq('bonus_type', 'DAILY_OIL')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as unknown as { data: { created_at: string; claim_date: string } | null; error: unknown };

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Calculate if user can claim today
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const lastClaimDate = lastClaim?.claim_date;

  // User can claim if they haven't claimed today
  const canClaim = !lastClaimDate || lastClaimDate !== today;

  // Calculate time until next claim (midnight UTC)
  const getTimeUntilMidnight = () => {
    if (canClaim) return 0;

    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return Math.max(0, tomorrow.getTime() - now.getTime());
  };

  const timeUntilNextClaim = getTimeUntilMidnight();

  // Claim mutation — uses atomic SECURITY DEFINER RPC
  // (direct balance updates from user JWT are blocked by RLS; the RPC bypasses this safely)
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!canClaim) throw new Error('Daily bonus already claimed');

      const today = new Date().toISOString().split('T')[0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('claim_daily_bonus', {
        p_user_id: user.id,
        p_bonus_type: 'DAILY_OIL',
        p_amount_oil: DAILY_BONUS_AMOUNT,
        p_claim_date: today,
      }) as { data: Array<{ success: boolean; message: string; new_balance: number }> | null; error: unknown };

      if (error) {
        console.error('Daily bonus RPC error:', error);
        throw new Error('Failed to claim bonus. Please try again.');
      }

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to claim bonus');
      }

      return { amount: DAILY_BONUS_AMOUNT, newBalance: result.new_balance };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_bonus', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      toast({
        title: "Daily Bonus Claimed!",
        description: `+${DAILY_BONUS_AMOUNT} Oil added to your balance`,
      });
    },
    onError: (error) => {
      console.error('Daily bonus claim error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to claim bonus",
        variant: "destructive",
      });
    },
  });

  return {
    canClaim,
    timeUntilNextClaim,
    bonusAmount: DAILY_BONUS_AMOUNT,
    isLoading,
    claim: claimMutation.mutate,
    isClaiming: claimMutation.isPending,
  };
}
