import { useState, useEffect, useCallback } from 'react';
import { binanceService, TickerData } from '@/services/binance';

export function useMarketPrice(symbol: string) {
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    // Fetch initial data
    binanceService.fetchTicker(symbol).then(data => {
      if (data) {
        setTicker(data);
      }
      setIsLoading(false);
    });

    // Subscribe to live updates
    const unsubscribe = binanceService.subscribeTicker(symbol, (data) => {
      setTicker(data);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [symbol]);

  return { ticker, isLoading };
}

export function useAllMarketPrices() {
  const [tickers, setTickers] = useState<Map<string, TickerData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tickerMap = new Map<string, TickerData>();
    const unsubscribes: (() => void)[] = [];

    // Fetch initial data
    binanceService.fetchAllTickers().then(data => {
      data.forEach(ticker => {
        tickerMap.set(ticker.symbol, ticker);
      });
      setTickers(new Map(tickerMap));
      setIsLoading(false);
    });

    // Subscribe to live updates for all symbols
    binanceService.SYMBOLS.forEach(symbol => {
      const unsubscribe = binanceService.subscribeTicker(symbol, (data) => {
        setTickers(prev => {
          const newMap = new Map(prev);
          newMap.set(data.symbol, data);
          return newMap;
        });
        setIsLoading(false);
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const getTickerArray = useCallback(() => {
    return Array.from(tickers.values());
  }, [tickers]);

  return { tickers, tickerArray: getTickerArray(), isLoading };
}
