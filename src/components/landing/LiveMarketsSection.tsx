import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllMarketPrices } from '@/hooks/useMarketPrices';
import { binanceService } from '@/services/binance';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function LiveMarketsSection() {
  const { tickerArray, isLoading } = useAllMarketPrices();

  return (
    <section className="container py-12 md:py-16 border-t border-border">
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Live Market Prices
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Real-time prices from Binance • Trade perpetual futures on top cryptocurrencies
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
        {isLoading ? (
          // Skeleton loading state
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-6 w-24 mb-1" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          tickerArray.map((ticker) => {
            const isPositive = binanceService.isPositiveChange(ticker.priceChangePercent);
            const displayName = binanceService.SYMBOL_NAMES[ticker.symbol] || ticker.symbol;
            
            return (
              <Card 
                key={ticker.symbol} 
                className="bg-card/50 hover:bg-card/80 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {displayName}
                    </span>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-lg md:text-xl font-mono font-bold">
                    ${binanceService.formatPrice(ticker.price, ticker.symbol)}
                  </p>
                  <p className={`text-sm font-mono ${isPositive ? 'text-primary' : 'text-destructive'}`}>
                    {binanceService.formatPercent(ticker.priceChangePercent)}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}
