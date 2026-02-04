import { TradeHistory } from '@/hooks/useTradesHistory';
import { binanceService } from '@/services/binance';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface TradesCardListProps {
  trades: TradeHistory[];
  isLoading?: boolean;
  onTradeClick: (trade: TradeHistory) => void;
}

export function TradesCardList({ trades, isLoading, onTradeClick }: TradesCardListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No trade history</p>
        <p className="text-sm mt-1">Your completed trades will appear here</p>
      </div>
    );
  }

  const formatNum = (num: number, decimals = 2) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="space-y-2">
      {trades.map((trade) => {
        const displayName = binanceService.SYMBOL_NAMES[trade.symbol] || trade.symbol;
        const pnl = trade.realized_pnl || 0;
        const isProfit = pnl >= 0;

        return (
          <div
            key={trade.id}
            className="p-3 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary/70 transition-colors active:scale-[0.98]"
            onClick={() => onTradeClick(trade)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{displayName}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium",
                  trade.side === 'long'
                    ? "bg-primary/20 text-primary"
                    : "bg-destructive/20 text-destructive"
                )}>
                  {trade.side.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">{trade.leverage}x</span>
              </div>
              <span className={cn(
                "font-mono font-bold text-sm",
                isProfit ? "text-primary" : "text-destructive"
              )}>
                {isProfit ? '+' : ''}{formatNum(pnl)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                ${formatNum(trade.entry_price)} → ${formatNum(trade.exit_price || 0)}
              </span>
              <span>
                {formatDistanceToNow(new Date(trade.closed_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
