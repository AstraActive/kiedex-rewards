import { memo, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireWallet } from '@/components/auth/RequireWallet';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CountdownTimer } from '@/components/shared/CountdownTimer';
import { Progress } from '@/components/ui/progress';
import { DailyBonusCard } from '@/components/tasks/DailyBonusCard';
import { SocialTaskCard } from '@/components/tasks/SocialTaskCard';
import { VolumeMilestoneCard } from '@/components/tasks/VolumeMilestoneCard';
import { TradingTaskCard } from '@/components/tasks/TradingTaskCard';
import { useTasks } from '@/hooks/useTasks';
import { useSocialTasks } from '@/hooks/useSocialTasks';
import { useVolumeMilestones } from '@/hooks/useVolumeMilestones';
import { Share2, TrendingUp, Zap } from 'lucide-react';

const TasksContent = memo(function TasksContent() {
  const { tasks, isLoading: tradingLoading, claimReward, isClaiming } = useTasks();
  const { 
    tasks: socialTasks, 
    isLoading: socialLoading, 
    submitProof,
    isSubmitting,
    claimReward: claimSocialReward, 
    isClaiming: isSocialClaiming,
    completedCount: socialCompleted,
    totalTasks: socialTotal,
  } = useSocialTasks();
  const { 
    milestones, 
    isLoading: volumeLoading, 
    claimMilestone, 
    isClaiming: isMilestoneClaiming 
  } = useVolumeMilestones();

  const isLoading = tradingLoading || socialLoading || volumeLoading;

  const overallProgress = useMemo(() => {
    const tradingCompleted = tasks.filter(t => t.completed).length;
    const tradingTotal = tasks.length;
    const volumeCompleted = milestones.filter(m => m.isCompleted).length;
    const volumeTotal = milestones.length;
    
    const total = tradingTotal + socialTotal + volumeTotal;
    const completed = tradingCompleted + socialCompleted + volumeCompleted;
    
    return { completed, total };
  }, [tasks, milestones, socialCompleted, socialTotal]);

  return (
    <AppLayout>
      <div className="container py-4 lg:py-6 pb-20 md:pb-6 space-y-4 lg:space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">Daily Tasks</h1>
            <p className="text-sm text-muted-foreground">Complete tasks to earn rewards</p>
          </div>
          <CountdownTimer />
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground font-medium">Today's Progress</span>
              <span className="text-sm text-primary font-semibold">
                {overallProgress.completed}/{overallProgress.total}
              </span>
            </div>
            <Progress 
              value={overallProgress.total > 0 ? (overallProgress.completed / overallProgress.total) * 100 : 0} 
              className="h-2" 
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <div className="space-y-4 lg:space-y-5">
            <DailyBonusCard />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Social Tasks</h2>
                <span className="text-xs text-muted-foreground ml-auto">
                  {socialCompleted}/{socialTotal} completed
                </span>
              </div>
              
              {socialLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)
              ) : (
                socialTasks.map(task => (
                  <SocialTaskCard
                    key={task.task_id}
                    {...task}
                    onSubmitProof={submitProof}
                    onClaimReward={claimSocialReward}
                    isSubmitting={isSubmitting}
                    isClaiming={isSocialClaiming}
                  />
                ))
              )}
            </div>
          </div>

          <div className="space-y-4 lg:space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Volume Milestones</h2>
                <span className="text-xs text-muted-foreground ml-auto">Daily reset</span>
              </div>
              
              {volumeLoading ? (
                [1, 2].map(i => <Skeleton key={i} className="h-28 w-full" />)
              ) : (
                milestones.map(milestone => (
                  <VolumeMilestoneCard
                    key={milestone.id}
                    {...milestone}
                    onClaim={claimMilestone}
                    isClaiming={isMilestoneClaiming}
                  />
                ))
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground">Trading Tasks</h2>
                <span className="text-xs text-muted-foreground ml-auto">Daily reset</span>
              </div>
              
              {tradingLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)
              ) : (
                tasks.map(task => (
                  <TradingTaskCard
                    key={task.id}
                    id={task.id}
                    name={task.name}
                    description={task.description}
                    reward={task.reward}
                    rewardType={task.rewardType}
                    progress={task.progress}
                    target={task.target}
                    completed={task.completed}
                    claimed={task.claimed}
                    onClaim={claimReward}
                    isClaiming={isClaiming}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
});

export default function Tasks() {
  return (
    <RequireAuth>
      <RequireWallet>
        <TasksContent />
      </RequireWallet>
    </RequireAuth>
  );
}
