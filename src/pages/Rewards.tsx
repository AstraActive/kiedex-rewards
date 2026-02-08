import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireMFA } from '@/components/auth/RequireMFA';
import { RequireWallet } from '@/components/auth/RequireWallet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from '@/components/shared/CountdownTimer';
import { useRewards } from '@/hooks/useRewards';
import { Gift, TrendingUp, Clock, CheckCircle2, Coins, Info, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function RewardsContent() {
  const {
    dailyPool,
    userVolumeToday,
    totalVolumeToday,
    userShareToday,
    estimatedRewards,
    claimableRewards,
    claimableDate,
    hasClaimableRewards,
    expiresAt,
    getTimeRemaining,
    claim,
    isClaiming,
    claimHistory,
    isLoading,
  } = useRewards();

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  const handleClaim = () => {
    if (!hasClaimableRewards) {
      toast.info("Rewards will be claimable after daily reset. Keep trading to earn!");
      return;
    }

    claim(undefined, {
      onSuccess: (data) => {
        toast.success(`Claimed ${formatNumber(data?.amount || 0)} KDX!`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <AppLayout>
      <div className="container py-3 md:py-4 pb-20 md:pb-6 space-y-3 md:space-y-4 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-lg md:text-xl font-semibold md:font-bold text-foreground">Daily Rewards</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Trade to earn KDX tokens from the daily pool
          </p>
        </div>

        {/* Today's Pool Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 md:py-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <Coins className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <p className="text-muted-foreground text-xs md:text-sm">Today's Pool</p>
            </div>
            <p className="text-2xl md:text-4xl font-bold text-primary mb-3">
              {formatNumber(dailyPool, 0)} KDX
            </p>
            <CountdownTimer className="text-xs md:text-sm" label="Resets in" />
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 gap-3 md:gap-4">
          {/* Estimated Rewards (Today's Preview) */}
          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm md:text-base flex items-center gap-1.5 md:gap-2">
                  <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                  Estimated Rewards
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] md:text-xs">Preview</Badge>
              </div>
              <CardDescription className="text-[10px] md:text-xs">
                Today's projected rewards based on current volume (updates live)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              {isLoading ? (
                <Skeleton className="h-8 md:h-10 w-full" />
              ) : (
                <>
                  <div className="text-xl md:text-3xl font-bold text-primary">
                    ~{formatNumber(estimatedRewards)} KDX
                  </div>
                  <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Your Volume (Counted)</span>
                      <span className="font-medium text-foreground">${formatNumber(userVolumeToday)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Pool Volume</span>
                      <span className="font-medium text-foreground">${formatNumber(totalVolumeToday)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Your Share</span>
                      <span className="font-medium text-foreground">{(userShareToday * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 md:p-3 bg-muted/50 rounded-lg text-[10px] md:text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 mt-0.5" />
                    <span>This is a preview. Final rewards are calculated at daily reset and become claimable the next day.</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Claimable Rewards */}
          <Card className={hasClaimableRewards ? 'border-primary/50 bg-primary/5' : ''}>
            <CardHeader className="pb-2 md:pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm md:text-base flex items-center gap-1.5 md:gap-2">
                  <Gift className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                  Claimable Rewards
                </CardTitle>
                {hasClaimableRewards && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] md:text-xs">Ready!</Badge>
                )}
              </div>
              <CardDescription className="text-[10px] md:text-xs">
                {claimableDate 
                  ? `Rewards from ${format(new Date(claimableDate + 'T00:00:00Z'), 'MMM d, yyyy')}`
                  : 'Finalized rewards ready to claim'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              {isLoading ? (
                <Skeleton className="h-8 md:h-10 w-full" />
              ) : (
                <>
                  <div className={`text-xl md:text-3xl font-bold ${hasClaimableRewards ? 'text-primary' : 'text-muted-foreground'}`}>
                    {formatNumber(claimableRewards)} KDX
                  </div>
                  
                  {/* Expiry Countdown */}
                  {hasClaimableRewards && expiresAt && (() => {
                    const timeLeft = getTimeRemaining();
                    
                    if (!timeLeft) {
                      return (
                        <div className="flex items-center gap-2 p-2.5 md:p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-destructive shrink-0" />
                          <span className="text-xs md:text-sm text-destructive font-medium">
                            Expired - Rewards can no longer be claimed
                          </span>
                        </div>
                      );
                    }
                    
                    const isUrgent = timeLeft.hours < 6;
                    const totalMs = 24 * 60 * 60 * 1000;
                    const remainingPercent = Math.max(0, Math.min(100, (timeLeft.totalMs / totalMs) * 100));
                    
                    return (
                      <div className="space-y-2">
                        <div className={`flex items-center gap-2 p-2.5 md:p-3 rounded-lg border ${
                          isUrgent 
                            ? 'bg-orange-500/10 border-orange-500/20' 
                            : 'bg-muted/50 border-muted'
                        }`}>
                          <Clock className={`h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 ${isUrgent ? 'text-orange-500' : 'text-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs md:text-sm font-medium ${isUrgent ? 'text-orange-500' : 'text-foreground'}`}>
                              {isUrgent ? '⚠️ Expiring Soon!' : 'Claim Window'}
                            </p>
                            <p className="text-[10px] md:text-xs text-muted-foreground">
                              {timeLeft.hours}h {timeLeft.minutes}m remaining
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                remainingPercent < 25 ? 'bg-destructive' :
                                remainingPercent < 50 ? 'bg-orange-500' :
                                'bg-primary'
                              }`}
                              style={{ width: `${remainingPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {hasClaimableRewards ? (
                    <Button 
                      onClick={handleClaim} 
                      disabled={isClaiming}
                      className="w-full"
                      size="lg"
                    >
                      {isClaiming ? (
                        <>Claiming...</>
                      ) : (
                        <>
                          <Gift className="h-4 w-4 mr-2" />
                          Claim {formatNumber(claimableRewards)} KDX
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="lg"
                      disabled
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      No Rewards to Claim
                    </Button>
                  )}

                  {!hasClaimableRewards && (
                    <div className="flex items-start gap-2 p-2.5 md:p-3 bg-muted/50 rounded-lg text-[10px] md:text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 mt-0.5" />
                      <span>Rewards will be available after daily reset. Trade today to earn tomorrow!</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Claim History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm md:text-base flex items-center gap-1.5 md:gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              Claim History
            </CardTitle>
            <CardDescription className="text-xs">Your past reward claims</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2 md:space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 md:h-12 w-full" />
                ))}
              </div>
            ) : claimHistory.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Gift className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs md:text-sm">No claims yet</p>
                <p className="text-[10px] md:text-xs">Start trading to earn rewards!</p>
              </div>
            ) : (
              <div className="space-y-1.5 md:space-y-2">
                {claimHistory.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between p-2.5 md:p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="space-y-0.5 md:space-y-1">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500" />
                        <span className="font-medium text-sm md:text-base">{formatNumber(claim.amount)} KDX</span>
                      </div>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {format(new Date(claim.claimed_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        Volume: ${formatNumber(claim.volume_score)}
                      </p>
                      {claim.wallet_address && (
                        <p className="text-[10px] md:text-xs text-muted-foreground font-mono">
                          {claim.wallet_address.slice(0, 6)}...{claim.wallet_address.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function Rewards() {
  return (
    <RequireAuth>
      <RequireMFA>
        <RequireWallet pageName="Rewards">
          <RewardsContent />
        </RequireWallet>
      </RequireMFA>
    </RequireAuth>
  );
}
