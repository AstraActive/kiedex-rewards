import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TradeHistory } from '@/hooks/useTradesHistory';
import { binanceService } from '@/services/binance';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface TradesTableProps {
  trades: TradeHistory[];
  isLoading?: boolean;
  compact?: boolean;
  onTradeClick?: (trade: TradeHistory) => void;
}

export function TradesTable({ trades, isLoading, compact, onTradeClick }: TradesTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-10 w-full" />
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

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="overflow-x-auto -mx-1 md:mx-0">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground text-xs py-2">Symbol</TableHead>
            <TableHead className="text-muted-foreground text-xs py-2">Side</TableHead>
            {!compact && (
              <>
                <TableHead className="text-muted-foreground text-xs py-2 text-right">Entry</TableHead>
                <TableHead className="text-muted-foreground text-xs py-2 text-right">Exit</TableHead>
              </>
            )}
            <TableHead className="text-muted-foreground text-xs py-2 text-right">PnL</TableHead>
            <TableHead className="text-muted-foreground text-xs py-2 text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => {
            const displayName = binanceService.SYMBOL_NAMES[trade.symbol] || trade.symbol;
            const pnl = trade.realized_pnl || 0;
            const isProfit = pnl >= 0;
            
            return (
              <TableRow 
                key={trade.id} 
                className={cn(
                  "border-border",
                  onTradeClick && "cursor-pointer hover:bg-secondary/50 transition-colors"
                )}
                onClick={() => onTradeClick?.(trade)}
              >
                <TableCell className="font-bold text-foreground text-xs py-2">
                  {displayName}
                </TableCell>
                <TableCell className="py-2">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    trade.side === 'long' 
                      ? "bg-primary/20 text-primary" 
                      : "bg-destructive/20 text-destructive"
                  )}>
                    {trade.side.toUpperCase()}
                  </span>
                </TableCell>
                {!compact && (
                  <>
                    <TableCell className="text-right font-mono text-foreground text-xs py-2">
                      ${formatNumber(trade.entry_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground text-xs py-2">
                      ${formatNumber(trade.exit_price || 0)}
                    </TableCell>
                  </>
                )}
                <TableCell className={cn(
                  "text-right font-mono font-medium text-xs py-2",
                  isProfit ? "text-primary" : "text-destructive"
                )}>
                  {isProfit ? '+' : ''}{formatNumber(pnl)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-[10px] py-2">
                  {formatDistanceToNow(new Date(trade.closed_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
