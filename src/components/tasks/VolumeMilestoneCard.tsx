import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Check, Fuel } from 'lucide-react';

interface VolumeMilestoneCardProps {
  id: string;
  name: string;
  targetVolume: number;
  rewardOil: number;
  progress: number;
  isCompleted: boolean;
  isClaimed: boolean;
  canClaim: boolean;
  onClaim: (milestoneId: string) => void;
  isClaiming: boolean;
}

function formatVolume(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export const VolumeMilestoneCard = memo(function VolumeMilestoneCard({
  id,
  name,
  targetVolume,
  rewardOil,
  progress,
  isCompleted,
  isClaimed,
  canClaim,
  onClaim,
  isClaiming,
}: VolumeMilestoneCardProps) {
  const progressPercent = Math.min(100, (progress / targetVolume) * 100);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-foreground truncate">{name}</h4>
              <p className="text-sm text-muted-foreground truncate">
                Trade {formatVolume(targetVolume)} volume today
              </p>
            </div>
          </div>
          
          <Badge variant="secondary" className="shrink-0 gap-1 whitespace-nowrap">
            <Fuel className="w-3 h-3" />
            +{rewardOil} Oil
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">
              {formatVolume(progress)} / {formatVolume(targetVolume)}
            </span>
          </div>
          
          <Progress value={progressPercent} className="h-2" />
          
          <div className="flex justify-end pt-1">
            {isClaimed ? (
              <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 gap-1">
                <Check className="w-3 h-3" />
                Claimed
              </Badge>
            ) : canClaim ? (
              <Button 
                size="sm" 
                onClick={() => onClaim(id)}
                disabled={isClaiming}
              >
                {isClaiming ? 'Claiming...' : 'Claim Reward'}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" disabled>
                Incomplete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
