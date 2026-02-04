import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireWallet } from '@/components/auth/RequireWallet';
import { PriceCardList } from '@/components/market/PriceCard';
import { PriceChart } from '@/components/market/PriceChart';
import { PositionsTable } from '@/components/trading/PositionsTable';
import { TradesTable } from '@/components/trading/TradesTable';
import { CountdownTimer } from '@/components/shared/CountdownTimer';
import { useProfile } from '@/hooks/useProfile';
import { useBalances } from '@/hooks/useBalances';
import { useAllMarketPrices } from '@/hooks/useMarketPrices';
import { useOpenPositions } from '@/hooks/useOpenPositions';
import { useTradesHistory } from '@/hooks/useTradesHistory';
import { useUserRank } from '@/hooks/useLeaderboard';
import { useTasks } from '@/hooks/useTasks';
import { useWelcomeBonus } from '@/hooks/useWelcomeBonus';
import { binanceService } from '@/services/binance';
import { useState } from 'react';
import { TimeFrame } from '@/hooks/useKlines';
import { 
  TrendingUp, Gift, Users, CheckSquare, Trophy, Copy, 
  ArrowRight, Coins, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PRODUCTION_URL } from '@/config/urls';

function DashboardContent() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: balances, isLoading: balancesLoading } = useBalances();
  const { tickerArray, isLoading: pricesLoading } = useAllMarketPrices();
  const { positions, isLoading: positionsLoading, closePosition, isClosing } = useOpenPositions();
  const { data: trades, isLoading: tradesLoading } = useTradesHistory(5);
  const { data: userRank } = useUserRank();
  const { tasks } = useTasks();
  useWelcomeBonus(); // Shows welcome bonus toast for new users

  const [chartSymbol, setChartSymbol] = useState('BTCUSDT');
  const [chartTimeframe, setChartTimeframe] = useState<TimeFrame>('15m');

  const isLoading = profileLoading || balancesLoading;

  const formatBalance = (value: string | number | null | undefined, decimals = 2) => {
    if (!value) return '0.00';
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const copyReferralLink = () => {
    // Always use production URL for referral links
    navigator.clipboard.writeText(`${PRODUCTION_URL}?ref=${profile?.referral_code}`);
    toast.success('Referral link copied!');
  };

  return (
    <AppLayout>
      <div className="container py-3 md:py-4 pb-20 md:pb-6 space-y-3 md:space-y-4">
        {/* Welcome */}
        <div>
          <h1 className="text-lg md:text-xl font-semibold md:font-bold text-foreground">
            {isLoading ? <Skeleton className="h-6 w-40" /> : (
              <>Welcome, {profile?.username || profile?.email?.split('@')[0] || 'Trader'}!</>
            )}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">Your trading dashboard</p>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-2 md:gap-3 grid-cols-3">
          <Card className="bg-card border-border">
            <CardContent className="p-2 md:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Coins className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                <span className="text-[10px] md:text-xs text-muted-foreground">KDX</span>
              </div>
              <div className="font-mono text-base md:text-lg font-semibold text-primary">
                {isLoading ? <Skeleton className="h-5 w-14" /> : formatBalance(balances?.kdx_balance)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-2 md:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-foreground" />
                <span className="text-[10px] md:text-xs text-muted-foreground">USDT</span>
              </div>
              <div className="font-mono text-base md:text-lg font-semibold text-foreground">
                {isLoading ? <Skeleton className="h-5 w-14" /> : formatBalance(balances?.demo_usdt_balance)}
              </div>
            </CardContent>
          </Card>

          <Link to="/wallet">
            <Card className="bg-card border-border hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-2 md:p-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs md:text-sm">🛢️</span>
                  <span className="text-[10px] md:text-xs text-muted-foreground">Oil</span>
                </div>
                <div className="font-mono text-base md:text-lg font-semibold text-foreground">
                  {isLoading ? <Skeleton className="h-5 w-14" /> : (balances?.oil_balance || 0).toLocaleString()}
                </div>
                <div className="text-[10px] md:text-xs text-primary mt-0.5 flex items-center gap-0.5">
                  Recharge <ArrowRight className="h-2.5 w-2.5 md:h-3 md:w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Market Tickers */}
        <div>
          <h2 className="text-xs md:text-sm font-semibold text-foreground mb-1.5 md:mb-2">Live Markets</h2>
          <PriceCardList tickers={tickerArray} isLoading={pricesLoading} />
        </div>

        {/* Chart */}
        <div>
          <div className="flex gap-1.5 md:gap-2 mb-1.5 md:mb-2 overflow-x-auto scrollbar-hide">
            {binanceService.SYMBOLS.map(sym => (
              <Button
                key={sym}
                variant={chartSymbol === sym ? 'default' : 'outline'}
                size="sm"
                className="h-6 md:h-7 text-[10px] md:text-xs px-2 md:px-3 flex-shrink-0"
                onClick={() => setChartSymbol(sym)}
              >
                {sym.replace('USDT', '')}
              </Button>
            ))}
          </div>
          <PriceChart 
            symbol={chartSymbol} 
            timeframe={chartTimeframe} 
            onTimeframeChange={setChartTimeframe}
            height={180}
          />
        </div>

        {/* Open Positions */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base text-foreground">Open Positions</CardTitle>
              <Link to="/trade">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                  Trade <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <PositionsTable 
              positions={positions.slice(0, 3)} 
              isLoading={positionsLoading}
              onClose={closePosition}
              isClosing={isClosing}
              compact
            />
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <TradesTable trades={trades || []} isLoading={tradesLoading} compact />
          </CardContent>
        </Card>

        {/* Rewards & Rank */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-1 md:pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm md:text-base text-foreground">Daily Rewards</CardTitle>
              <CountdownTimer />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-2 md:mb-3">
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Your Rank</p>
                <p className="font-mono text-lg md:text-xl font-semibold md:font-bold text-foreground">
                  #{userRank?.rank || '-'}
                </p>
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Today's Volume</p>
                <p className="font-mono text-lg md:text-xl font-semibold md:font-bold text-foreground">
                  ${formatBalance(userRank?.total_volume || 0)}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 md:gap-2">
              <Link to="/rewards" className="flex-1">
                <Button variant="default" size="sm" className="w-full">
                  <Gift className="h-4 w-4 mr-1" /> Claim
                </Button>
              </Link>
              <Link to="/leaderboard" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Trophy className="h-4 w-4 mr-1" /> Leaderboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}

export default function Dashboard() {
  return (
    <RequireAuth>
      <RequireWallet>
        <DashboardContent />
      </RequireWallet>
    </RequireAuth>
  );
}
