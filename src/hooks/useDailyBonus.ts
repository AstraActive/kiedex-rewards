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
        .select('created_at')
        .eq('user_id', user.id)
        .eq('bonus_type', 'DAILY_OIL')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Calculate time until next claim
  const now = new Date();
  const lastClaimTime = lastClaim?.created_at ? new Date(lastClaim.created_at) : null;
  const nextClaimTime = lastClaimTime 
    ? new Date(lastClaimTime.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000)
    : null;
  
  const canClaim = !lastClaimTime || now >= nextClaimTime!;
  const timeUntilNextClaim = nextClaimTime && !canClaim
    ? Math.max(0, nextClaimTime.getTime() - now.getTime())
    : 0;

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!canClaim) throw new Error('Daily bonus already claimed');

      // Insert bonus claim
      const { error: claimError } = await supabase
        .from('bonus_claims')
        .insert({
          user_id: user.id,
          bonus_type: 'DAILY_OIL',
          amount_oil: DAILY_BONUS_AMOUNT,
        });

      if (claimError) {
        console.error('Bonus claim insert error:', claimError);
        throw new Error(`Failed to record bonus claim: ${claimError.message}`);
      }

      // Get current oil balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('balances')
        .select('oil_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (balanceError) {
        console.error('Balance fetch error:', balanceError);
        throw new Error(`Failed to fetch balance: ${balanceError.message}`);
      }

      const currentOil = balanceData?.oil_balance || 0;
      const newOilBalance = currentOil + DAILY_BONUS_AMOUNT;

      // Use upsert to handle both insert and update atomically
      const { error: upsertError } = await supabase
        .from('balances')
        .upsert(
          {
            user_id: user.id,
            oil_balance: newOilBalance,
          },
          { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          }
        );

      if (upsertError) {
        console.error('Balance upsert error:', upsertError);
        throw new Error(`Failed to update balance: ${upsertError.message}`);
      }

      return { amount: DAILY_BONUS_AMOUNT };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_bonus'] });
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
