import { memo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Clock } from 'lucide-react';
import { useDailyBonus } from '@/hooks/useDailyBonus';
import { Skeleton } from '@/components/ui/skeleton';

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

export const DailyBonusCard = memo(function DailyBonusCard() {
  const { canClaim, timeUntilNextClaim, bonusAmount, isLoading, claim, isClaiming } = useDailyBonus();
  const [countdown, setCountdown] = useState(timeUntilNextClaim);

  useEffect(() => {
    setCountdown(timeUntilNextClaim);
    
    if (timeUntilNextClaim <= 0) return;
    
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timeUntilNextClaim]);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30">
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">Daily Bonus</h3>
              <p className="text-sm text-primary font-medium truncate">+{bonusAmount} Oil</p>
            </div>
          </div>
          
          {canClaim ? (
            <Button 
              onClick={() => claim()}
              disabled={isClaiming}
              className="min-w-[100px] shrink-0"
            >
              {isClaiming ? 'Claiming...' : 'Claim'}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg shrink-0">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium whitespace-nowrap">{formatTimeRemaining(countdown)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
