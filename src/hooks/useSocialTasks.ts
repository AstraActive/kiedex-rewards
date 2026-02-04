import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { validateProof } from '@/lib/proofValidation';

// Database table row type
export interface SocialTask {
  id: string;
  task_id: string;
  name: string;
  description: string;
  reward: number;
  reward_type: string;
  link: string;
  icon_name: string;
  proof_type: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TaskSubmission {
  id: string;
  task_id: string;
  proof_value: string;
  status: string;
  created_at: string;
}

interface SocialTaskProgress {
  task_id: string;
  completed: boolean;
  claimed: boolean;
}

export interface TaskWithProgress extends SocialTask {
  status: 'idle' | 'waitingProof' | 'submitted' | 'completed' | 'claimed';
  proofValue?: string;
  submittedAt?: string;
}

interface SubmitProofArgs {
  taskId: string;
  proofValue: string;
  proofType: string;
}

export function useSocialTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch social tasks from database (with type bypass for untyped table)
  const { data: socialTasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['social_tasks_list'],
    queryFn: async (): Promise<SocialTask[]> => {
      // Use type assertion to bypass TypeScript check for untyped table
      const { data, error } = await (supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (column: string, value: boolean) => {
              order: (column: string, options: { ascending: boolean }) => Promise<{ data: unknown[]; error: unknown }>;
            };
          };
        };
      }).from('social_tasks')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as SocialTask[];
    },
    staleTime: 60_000, // Cache for 1 minute
  });

  // Fetch task submissions from user
  const { data: submissions, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['task_submissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('task_submissions')
        .select('id, task_id, proof_value, status, created_at')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as TaskSubmission[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Fetch legacy progress for claimed status
  const { data: taskProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['social_tasks_progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('social_tasks_progress')
        .select('task_id, completed, claimed')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as SocialTaskProgress[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Combine tasks with submissions and progress
  const tasksWithProgress: TaskWithProgress[] = (socialTasks || []).map(task => {
    const submission = submissions?.find(s => s.task_id === task.task_id);
    const progress = taskProgress?.find(p => p.task_id === task.task_id);

    // Determine status
    let status: TaskWithProgress['status'] = 'idle';

    if (progress?.claimed) {
      status = 'claimed';
    } else if (submission) {
      if (submission.status === 'completed' || submission.status === 'approved') {
        status = 'completed';
      } else {
        status = 'submitted';
      }
    }

    return {
      ...task,
      status,
      proofValue: submission?.proof_value,
      submittedAt: submission?.created_at,
    };
  });

  // Submit proof mutation
  const submitProofMutation = useMutation({
    mutationFn: async ({ taskId, proofValue, proofType }: SubmitProofArgs) => {
      if (!user?.id) throw new Error('Not authenticated');

      // 1. Validate proof format
      const validation = validateProof(proofType, proofValue);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid proof format');
      }

      // 2. Get wallet address from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('linked_wallet_address')
        .eq('user_id', user.id)
        .single();

      // 3. Normalize proof value (lowercase for usernames, keep URLs as-is)
      const normalizedProof = (proofType === 'tweet_link' || proofType === 'web_link')
        ? proofValue.trim()
        : proofValue.trim().toLowerCase();

      // 4. Insert submission (DB will check uniqueness)
      const { error } = await supabase
        .from('task_submissions')
        .insert({
          user_id: user.id,
          task_id: taskId,
          proof_type: proofType,
          proof_value: normalizedProof,
          wallet_address: profile?.linked_wallet_address || null,
          status: 'completed',
        });

      if (error) {
        // Handle duplicate proof error (PostgreSQL unique violation)
        if (error.code === '23505') {
          if (error.message.includes('unique_proof')) {
            throw new Error('This proof is already used by another user. Please submit your own.');
          }
          if (error.message.includes('unique_user_task')) {
            throw new Error('You have already submitted proof for this task.');
          }
        }
        throw error;
      }

      // 5. Also update social_tasks_progress for backward compatibility
      const existing = taskProgress?.find(p => p.task_id === taskId);

      if (existing) {
        await supabase
          .from('social_tasks_progress')
          .update({
            completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('task_id', taskId);
      } else {
        await supabase
          .from('social_tasks_progress')
          .insert({
            user_id: user.id,
            task_id: taskId,
            completed: true,
            completed_at: new Date().toISOString(),
          });
      }

      return { taskId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_submissions'] });
      queryClient.invalidateQueries({ queryKey: ['social_tasks_progress'] });
      toast({
        title: "Proof Submitted!",
        description: "You can now claim your reward",
      });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit proof",
        variant: "destructive",
      });
    },
  });

  // Claim reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const task = socialTasks?.find(t => t.task_id === taskId);
      if (!task) throw new Error('Task not found');

      const taskWithProgress = tasksWithProgress.find(t => t.task_id === taskId);
      if (taskWithProgress?.status !== 'completed') {
        throw new Error('Task not completed yet');
      }

      // Mark as claimed
      const { error: updateError } = await supabase
        .from('social_tasks_progress')
        .update({
          claimed: true,
          claimed_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('task_id', taskId);

      if (updateError) throw updateError;

      // Add reward to balance based on reward_type
      const { data: balanceData, error: balanceError } = await supabase
        .from('balances')
        .select('demo_usdt_balance, oil_balance, kdx_balance')
        .eq('user_id', user.id)
        .single();

      if (balanceError) throw balanceError;

      let updatePayload: Record<string, number> = {};

      switch (task.reward_type) {
        case 'usdt':
          updatePayload = { demo_usdt_balance: (balanceData?.demo_usdt_balance || 0) + task.reward };
          break;
        case 'oil':
          updatePayload = { oil_balance: (balanceData?.oil_balance || 0) + task.reward };
          break;
        case 'kdx':
          updatePayload = { kdx_balance: (balanceData?.kdx_balance || 0) + task.reward };
          break;
        default:
          updatePayload = { demo_usdt_balance: (balanceData?.demo_usdt_balance || 0) + task.reward };
      }

      const { error: rewardError } = await supabase
        .from('balances')
        .update(updatePayload)
        .eq('user_id', user.id);

      if (rewardError) throw rewardError;

      return { reward: task.reward, rewardType: task.reward_type };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social_tasks_progress'] });
      queryClient.invalidateQueries({ queryKey: ['task_submissions'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });

      const typeLabel = data.rewardType === 'oil' ? 'Oil' : data.rewardType === 'kdx' ? 'KDX' : 'Bonus USDT';
      toast({
        title: "Reward Claimed!",
        description: `+${data.reward} ${typeLabel} added to your balance`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to claim reward",
        variant: "destructive",
      });
    },
  });

  const isLoading = isLoadingTasks || isLoadingSubmissions || isLoadingProgress;
  const completedCount = tasksWithProgress.filter(t => t.status === 'completed' || t.status === 'claimed').length;
  const claimedCount = tasksWithProgress.filter(t => t.status === 'claimed').length;

  return {
    tasks: tasksWithProgress,
    isLoading,
    submitProof: submitProofMutation.mutate,
    isSubmitting: submitProofMutation.isPending,
    claimReward: claimRewardMutation.mutate,
    isClaiming: claimRewardMutation.isPending,
    completedCount,
    claimedCount,
    totalTasks: socialTasks?.length || 0,
  };
}
