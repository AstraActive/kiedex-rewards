import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface VolumeMilestone {
  id: string;
  name: string;
  targetVolume: number;
  rewardOil: number;
}

export const VOLUME_MILESTONES: VolumeMilestone[] = [
  {
    id: 'volume_10k',
    name: 'Volume Master I',
    targetVolume: 10000,
    rewardOil: 500,
  },
  {
    id: 'volume_50k',
    name: 'Volume Master II',
    targetVolume: 50000,
    rewardOil: 200,
  },
];

export function useVolumeMilestones() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's trading volume from leaderboard
  const { data: todayVolume, isLoading: volumeLoading } = useQuery({
    queryKey: ['today_volume', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await supabase
        .from('leaderboard_daily')
        .select('total_volume')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data?.total_volume || 0;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Fetch today's milestone claims
  const { data: claimedMilestones, isLoading: claimsLoading } = useQuery({
    queryKey: ['volume_milestone_claims', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('volume_milestone_claims')
        .select('milestone_id')
        .eq('user_id', user.id)
        .eq('date', today);
      
      if (error) throw error;
      return data.map(d => d.milestone_id);
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Combine milestones with progress
  const milestonesWithProgress = VOLUME_MILESTONES.map(milestone => {
    const progress = Math.min(todayVolume || 0, milestone.targetVolume);
    const isCompleted = progress >= milestone.targetVolume;
    const isClaimed = claimedMilestones?.includes(milestone.id) || false;
    
    return {
      ...milestone,
      progress,
      isCompleted,
      isClaimed,
      canClaim: isCompleted && !isClaimed,
    };
  });

  // Claim milestone reward
  const claimMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const milestone = VOLUME_MILESTONES.find(m => m.id === milestoneId);
      if (!milestone) throw new Error('Milestone not found');
      
      const currentVolume = todayVolume || 0;
      if (currentVolume < milestone.targetVolume) {
        throw new Error('Milestone not reached');
      }
      
      if (claimedMilestones?.includes(milestoneId)) {
        throw new Error('Already claimed today');
      }

      // Insert claim record
      const { error: claimError } = await supabase
        .from('volume_milestone_claims')
        .insert({
          user_id: user.id,
          milestone_id: milestoneId,
          date: today,
          volume_reached: currentVolume,
          reward_oil: milestone.rewardOil,
        });

      if (claimError) throw claimError;

      // Update oil balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('balances')
        .select('oil_balance')
        .eq('user_id', user.id)
        .single();

      if (balanceError) throw balanceError;

      const { error: updateError } = await supabase
        .from('balances')
        .update({ 
          oil_balance: (balanceData?.oil_balance || 0) + milestone.rewardOil 
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return { reward: milestone.rewardOil };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['volume_milestone_claims'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      toast({
        title: "Milestone Reached!",
        description: `+${data.reward} Oil added to your balance`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to claim milestone",
        variant: "destructive",
      });
    },
  });

  return {
    milestones: milestonesWithProgress,
    todayVolume: todayVolume || 0,
    isLoading: volumeLoading || claimsLoading,
    claimMilestone: claimMutation.mutate,
    isClaiming: claimMutation.isPending,
  };
}
