import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { binanceService, TickerData } from '@/services/binance';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceCardProps {
  ticker: TickerData | null;
  isLoading?: boolean;
  compact?: boolean;
}

export function PriceCard({ ticker, isLoading, compact }: PriceCardProps) {
  if (isLoading || !ticker) {
    return (
      <Card className={cn(
        "p-3 bg-card border-border",
        compact ? "min-w-[140px]" : "min-w-[160px]"
      )}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
      </Card>
    );
  }

  const isPositive = binanceService.isPositiveChange(ticker.priceChangePercent);
  const displayName = binanceService.SYMBOL_NAMES[ticker.symbol] || ticker.symbol;

  return (
    <Link to={`/trade?symbol=${ticker.symbol}`}>
      <Card className={cn(
        "p-3 bg-card border-border hover:bg-accent/50 transition-colors cursor-pointer",
        compact ? "min-w-[140px]" : "min-w-[160px]"
      )}>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-primary" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
          </div>
          
          <div className="font-mono text-lg font-semibold text-foreground">
            ${binanceService.formatPrice(ticker.price, ticker.symbol)}
          </div>
          
          <div className={cn(
            "text-sm font-medium",
            isPositive ? "text-primary" : "text-destructive"
          )}>
            {binanceService.formatPercent(ticker.priceChangePercent)}
          </div>
        </div>
      </Card>
    </Link>
  );
}

interface PriceCardListProps {
  tickers: TickerData[];
  isLoading?: boolean;
}

export function PriceCardList({ tickers, isLoading }: PriceCardListProps) {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {binanceService.SYMBOLS.map((_, i) => (
          <PriceCard key={i} ticker={null} isLoading />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {tickers.map(ticker => (
        <PriceCard key={ticker.symbol} ticker={ticker} />
      ))}
    </div>
  );
}
