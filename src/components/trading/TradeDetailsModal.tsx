import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TradeHistory } from '@/hooks/useTradesHistory';
import { binanceService } from '@/services/binance';
import { cn } from '@/lib/utils';
import { format, formatDistanceStrict } from 'date-fns';
import { TrendingUp, TrendingDown, Clock, Fuel } from 'lucide-react';

interface TradeDetailsModalProps {
  trade: TradeHistory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TradeDetailsModal({ trade, open, onOpenChange }: TradeDetailsModalProps) {
  if (!trade) return null;

  const displayName = binanceService.SYMBOL_NAMES[trade.symbol] || trade.symbol;
  const pnl = trade.realized_pnl || 0;
  const isProfit = pnl >= 0;
  const pnlPercent = trade.margin > 0 ? (pnl / trade.margin) * 100 : 0;

  const formatNum = (num: number, decimals = 2) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const duration = formatDistanceStrict(
    new Date(trade.opened_at),
    new Date(trade.closed_at)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-bold text-lg">{displayName}</span>
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              trade.side === 'long'
                ? "bg-primary/20 text-primary"
                : "bg-destructive/20 text-destructive"
            )}>
              {trade.side.toUpperCase()}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* PnL Highlight */}
          <div className={cn(
            "p-4 rounded-lg text-center",
            isProfit ? "bg-primary/10" : "bg-destructive/10"
          )}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {isProfit ? (
                <TrendingUp className="h-5 w-5 text-primary" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              <span className={cn(
                "text-2xl font-bold",
                isProfit ? "text-primary" : "text-destructive"
              )}>
                {isProfit ? '+' : ''}{formatNum(pnl)} USDT
              </span>
            </div>
            <p className={cn(
              "text-sm",
              isProfit ? "text-primary/80" : "text-destructive/80"
            )}>
              {isProfit ? '+' : ''}{formatNum(pnlPercent)}% ROI
            </p>
          </div>

          {/* Trade Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Leverage</p>
              <p className="font-medium text-foreground">{trade.leverage}x</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Margin</p>
              <p className="font-medium text-foreground">${formatNum(trade.margin)}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Entry Price</p>
              <p className="font-mono font-medium text-foreground">${formatNum(trade.entry_price)}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Exit Price</p>
              <p className="font-mono font-medium text-foreground">${formatNum(trade.exit_price || 0)}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Position Size</p>
              <p className="font-medium text-foreground">${formatNum(trade.position_size)}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg flex items-center gap-2">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Fee (Oil)</p>
                <p className="font-medium text-foreground flex items-center gap-1">
                  <Fuel className="h-3 w-3 text-warning" />
                  {formatNum(trade.fee_paid, 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Time Details */}
          <div className="p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Duration: {duration}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Opened</p>
                <p className="text-foreground">{format(new Date(trade.opened_at), 'MMM d, HH:mm:ss')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Closed</p>
                <p className="text-foreground">{format(new Date(trade.closed_at), 'MMM d, HH:mm:ss')}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
