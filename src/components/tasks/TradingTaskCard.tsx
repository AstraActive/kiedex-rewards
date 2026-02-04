import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Zap, DollarSign, Fuel, Loader2 } from 'lucide-react';

interface TradingTaskCardProps {
  id: string;
  name: string;
  description: string;
  reward: number;
  rewardType: 'usdt' | 'kdx' | 'score' | 'oil';
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  onClaim: (taskId: string) => void;
  isClaiming: boolean;
}

export const TradingTaskCard = memo(function TradingTaskCard({
  id,
  name,
  description,
  reward,
  rewardType,
  progress,
  target,
  completed,
  claimed,
  onClaim,
  isClaiming,
}: TradingTaskCardProps) {
  const progressPercent = Math.min(100, (progress / target) * 100);
  
  const rewardIcon = rewardType === 'usdt' ? (
    <DollarSign className="w-3 h-3" />
  ) : rewardType === 'oil' ? (
    <Fuel className="w-3 h-3" />
  ) : (
    <Zap className="w-3 h-3" />
  );
  
  const rewardLabel = rewardType === 'usdt' ? 'USDT' : rewardType === 'oil' ? 'Oil' : 'KDX';

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3 lg:p-4">
        <div className="flex items-start gap-3">
          {/* Icon Container */}
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-foreground text-sm lg:text-base truncate">{name}</h4>
                <p className="text-xs lg:text-sm text-muted-foreground truncate">{description}</p>
              </div>
              
              <Badge variant="secondary" className="shrink-0 gap-1 text-xs whitespace-nowrap">
                {rewardIcon}
                +{reward} {rewardLabel}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs lg:text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">
                  {progress} / {target}
                </span>
              </div>
              
              <Progress value={progressPercent} className="h-2" />
              
              <div className="flex justify-end pt-1">
                {claimed ? (
                  <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 gap-1">
                    <Check className="w-3 h-3" />
                    Claimed
                  </Badge>
                ) : completed ? (
                  <Button 
                    size="sm" 
                    onClick={() => onClaim(id)}
                    disabled={isClaiming}
                    className="gap-1.5"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      'Claim Reward'
                    )}
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" disabled>
                    Incomplete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
