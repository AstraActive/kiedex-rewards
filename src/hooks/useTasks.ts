import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TaskDefinition {
  id: string;
  name: string;
  description: string;
  target: number;
  reward: number;
  rewardType: 'usdt' | 'kdx' | 'score' | 'oil';
}

export interface TaskProgress {
  id: string;
  user_id: string;
  task_id: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  date: string;
  updated_at: string;
}

// Daily task definitions
export const DAILY_TASKS: TaskDefinition[] = [
  {
    id: 'trade_3',
    name: 'Active Trader',
    description: 'Complete 3 trades today',
    target: 3,
    reward: 50,
    rewardType: 'kdx',
  },
  {
    id: 'volume_1000',
    name: 'Volume Master',
    description: 'Trade $1,000 volume today',
    target: 1000,
    reward: 100,
    rewardType: 'kdx',
  },
  {
    id: 'win_2',
    name: 'Winning Streak',
    description: 'Win 2 profitable trades',
    target: 2,
    reward: 50,
    rewardType: 'kdx',
  },
];

export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  // Get today's task progress
  const { data: taskProgress, isLoading } = useQuery({
    queryKey: ['tasks_progress', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('tasks_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);
      
      if (error) throw error;
      return data as TaskProgress[];
    },
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes cache
  });

  // Get task progress with definitions
  const tasksWithProgress = DAILY_TASKS.map(task => {
    const progress = taskProgress?.find(p => p.task_id === task.id);
    return {
      ...task,
      progress: progress?.progress || 0,
      completed: progress?.completed || false,
      claimed: progress?.claimed || false,
    };
  });

  // Claim task reward mutation
  const claimMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const task = DAILY_TASKS.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');

      const progress = taskProgress?.find(p => p.task_id === taskId);
      if (!progress || !progress.completed) throw new Error('Task not completed');
      if (progress.claimed) throw new Error('Already claimed');

      // Mark as claimed
      const { error: updateError } = await supabase
        .from('tasks_progress')
        .update({ claimed: true })
        .eq('id', progress.id);

      if (updateError) throw updateError;

      // Add reward to balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('balances')
        .select('demo_usdt_balance, kdx_balance')
        .eq('user_id', user.id)
        .single();

      if (balanceError) throw balanceError;

      const updateData: { demo_usdt_balance?: number; kdx_balance?: number } = {};
      
      if (task.rewardType === 'usdt') {
        updateData.demo_usdt_balance = (balanceData?.demo_usdt_balance || 0) + task.reward;
      } else if (task.rewardType === 'kdx') {
        updateData.kdx_balance = (balanceData?.kdx_balance || 0) + task.reward;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: rewardError } = await supabase
          .from('balances')
          .update(updateData)
          .eq('user_id', user.id);

        if (rewardError) throw rewardError;
      }

      return { reward: task.reward, type: task.rewardType };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks_progress'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
  });

  const completedCount = tasksWithProgress.filter(t => t.completed).length;
  const claimedCount = tasksWithProgress.filter(t => t.claimed).length;

  return {
    tasks: tasksWithProgress,
    isLoading,
    claimReward: claimMutation.mutate,
    isClaiming: claimMutation.isPending,
    completedCount,
    claimedCount,
    totalTasks: DAILY_TASKS.length,
  };
}
