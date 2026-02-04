import { useState, useEffect, useRef } from 'react';
import { binanceService, KlineData } from '@/services/binance';

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h';

export function useKlines(symbol: string, interval: TimeFrame = '15m') {
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const klinesRef = useRef<KlineData[]>([]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    klinesRef.current = [];

    // Fetch historical data
    binanceService.fetchKlines(symbol, interval, 100)
      .then(data => {
        klinesRef.current = data;
        setKlines(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError('Failed to load chart data');
        setIsLoading(false);
      });

    // Subscribe to live kline updates
    const unsubscribe = binanceService.subscribeKlines(symbol, interval, (newKline) => {
      setKlines(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        
        if (lastIndex >= 0 && updated[lastIndex].time === newKline.time) {
          // Update existing candle
          updated[lastIndex] = newKline;
        } else if (lastIndex < 0 || newKline.time > updated[lastIndex].time) {
          // Add new candle
          updated.push(newKline);
          // Keep last 100 candles
          if (updated.length > 100) {
            updated.shift();
          }
        }
        
        return updated;
      });
    });

    return unsubscribe;
  }, [symbol, interval]);

  return { klines, isLoading, error };
}
