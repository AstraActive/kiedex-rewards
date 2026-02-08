import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireMFA } from '@/components/auth/RequireMFA';
import { RequireWallet } from '@/components/auth/RequireWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useLeaderboard, useUserRank, LeaderboardType, LeaderboardPeriod } from '@/hooks/useLeaderboard';
import { Trophy, Medal, Award, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function LeaderboardContent() {
  const [type, setType] = useState<LeaderboardType>('volume');
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily');
  const { data: entries, isLoading, isError, refetch, isFetching } = useLeaderboard(type, period);
  const { data: userRank } = useUserRank(period);

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground font-mono">#{rank}</span>;
  };

  const maskUserId = (userId: string) => {
    return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
  };

  const getPeriodLabel = () => {
    if (period === 'daily') return "Today's";
    if (period === 'weekly') return "This Week's";
    return "This Month's";
  };

  return (
    <AppLayout>
      <div className="container py-3 md:py-4 pb-20 md:pb-6 space-y-3 md:space-y-4">
        <div>
          <h1 className="text-lg md:text-xl font-semibold md:font-bold text-foreground">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">{getPeriodLabel()} top traders</p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as LeaderboardPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>

        {/* User's Rank */}
        {userRank && (
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getRankIcon(userRank.rank)}
                  <div>
                    <p className="text-xs text-muted-foreground">Your Rank</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">#{userRank.rank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="font-mono font-semibold text-sm md:text-base text-foreground">
                    ${formatNumber(userRank.total_counted_volume)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Tabs */}
        <Tabs value={type} onValueChange={(v) => setType(v as LeaderboardType)}>
          <TabsList className="bg-secondary w-full">
            <TabsTrigger value="volume" className="flex-1 text-xs md:text-sm">Volume</TabsTrigger>
            <TabsTrigger value="pnl" className="flex-1 text-xs md:text-sm">PnL</TabsTrigger>
            <TabsTrigger value="winrate" className="flex-1 text-xs md:text-sm">Win Rate</TabsTrigger>
          </TabsList>

          <TabsContent value={type} className="mt-3 md:mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 p-3 md:p-6">
                <CardTitle className="text-sm md:text-base text-foreground">
                  Top 100 by {type === 'volume' ? 'Volume' : type === 'pnl' ? 'PnL' : 'Win Rate'}
                  {type === 'winrate' && <span className="text-xs text-muted-foreground ml-2">(min. 3 trades)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                {isError ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                    <p className="text-center text-muted-foreground text-sm">
                      Failed to load leaderboard data
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetch()}
                      disabled={isFetching}
                      className="gap-2"
                    >
                      <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                      {isFetching ? 'Retrying...' : 'Retry'}
                    </Button>
                  </div>
                ) : isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 md:h-14 w-full" />)}
                  </div>
                ) : !entries || entries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No data for this period yet. Start trading!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div 
                        key={entry.id}
                        className={cn(
                          "flex items-center justify-between p-2 md:p-3 rounded-lg",
                          entry.rank && entry.rank <= 3 ? "bg-primary/5" : "bg-secondary/50"
                        )}
                      >
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-7 md:w-8 flex justify-center">
                            {getRankIcon(entry.rank!)}
                          </div>
                          <span className="text-xs md:text-sm text-foreground font-mono">
                            {maskUserId(entry.user_id)}
                          </span>
                        </div>
                        <div className="text-right">
                          {type === 'volume' && (
                            <p className="font-mono font-semibold text-sm md:text-base text-foreground">
                              ${formatNumber(entry.total_counted_volume)}
                            </p>
                          )}
                          {type === 'pnl' && (
                            <p className={cn(
                              "font-mono font-semibold text-sm md:text-base",
                              entry.total_pnl >= 0 ? "text-primary" : "text-destructive"
                            )}>
                              {entry.total_pnl >= 0 ? '+' : ''}{formatNumber(entry.total_pnl)}
                            </p>
                          )}
                          {type === 'winrate' && (
                            <p className="font-mono font-semibold text-sm md:text-base text-foreground">
                              {formatNumber(entry.winRate || 0)}%
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {entry.trade_count} trades
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default function Leaderboard() {
  return (
    <RequireAuth>
      <RequireMFA>
        <RequireWallet pageName="Leaderboard">
          <LeaderboardContent />
        </RequireWallet>
      </RequireMFA>
    </RequireAuth>
  );
}
