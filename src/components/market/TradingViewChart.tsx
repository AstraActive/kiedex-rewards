import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi,
  CandlestickData, 
  LineData, 
  CrosshairMode, 
  Time,
  ColorType,
  CandlestickSeries,
  LineSeries,
} from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { binanceService, KlineData } from '@/services/binance';
import { cn } from '@/lib/utils';
import { TimeFrame } from '@/hooks/useKlines';

interface TradingViewChartProps {
  symbol: string;
  timeframe: TimeFrame;
  onTimeframeChange?: (tf: TimeFrame) => void;
  height?: number;
  showControls?: boolean;
  chartType?: 'candlestick' | 'line';
  onChartTypeChange?: (type: 'candlestick' | 'line') => void;
}

const TIMEFRAMES: { value: TimeFrame; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
];

function getPriceDecimals(symbol: string): number {
  if (symbol.includes('SHIB')) return 8;
  if (symbol.includes('DOGE') || symbol.includes('TRX')) return 5;
  if (symbol.includes('SOL')) return 4;
  return 2;
}

export function TradingViewChart({
  symbol,
  timeframe,
  onTimeframeChange,
  height = 400,
  showControls = true,
  chartType = 'candlestick',
  onChartTypeChange,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null);
  const klinesRef = useRef<KlineData[]>([]);
  const lastUpdateRef = useRef<number>(0);
  const wsUnsubscribeRef = useRef<(() => void) | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false); // Keep for UI indicator
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [ohlc, setOhlc] = useState<{ o: number; h: number; l: number; c: number } | null>(null);

  const displayName = binanceService.SYMBOL_NAMES[symbol] || symbol;
  const decimals = getPriceDecimals(symbol);

  // Emergency fix: Force loading to false after 3 seconds if data doesn't load
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      console.warn('EMERGENCY: Forcing chart loading state to false after 3 seconds');
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(emergencyTimeout);
  }, []);

  // Convert kline to chart format
  const toChartData = useCallback((kline: KlineData): CandlestickData<Time> | LineData<Time> => {
    const time = (kline.time / 1000) as Time;
    if (chartType === 'line') {
      return { time, value: kline.close };
    }
    return {
      time,
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
    };
  }, [chartType]);

  // Initialize chart only once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    
    // Create chart with explicit dimensions
    const chart = createChart(container, {
      width: container.clientWidth || 600,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#888888',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#22c55e',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: '#22c55e',
          width: 1,
          style: 2,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255,255,255,0.1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.1)',
      },
    });

    chartRef.current = chart;

    // Use ResizeObserver for proper resize handling
    resizeObserverRef.current = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartRef.current) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        chartRef.current.applyOptions({ width });
      }
    });
    resizeObserverRef.current.observe(container);

    // Crosshair move handler for OHLC tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData || !seriesRef.current) return;
      const data = param.seriesData.get(seriesRef.current);
      if (data && 'open' in data) {
        const candleData = data as CandlestickData<Time>;
        setOhlc({ o: candleData.open, h: candleData.high, l: candleData.low, c: candleData.close });
      } else if (data && 'value' in data) {
        const lineData = data as LineData<Time>;
        setOhlc({ o: lineData.value, h: lineData.value, l: lineData.value, c: lineData.value });
      }
    });

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  // Create/update series when chartType or decimals change
  useEffect(() => {
    if (!chartRef.current) return;

    // Remove existing series
    if (seriesRef.current) {
      try {
        chartRef.current.removeSeries(seriesRef.current);
      } catch (e) {
        // Series might already be removed
      }
      seriesRef.current = null;
    }

    // Create new series
    if (chartType === 'candlestick') {
      seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        borderVisible: false,
        priceFormat: {
          type: 'price',
          precision: decimals,
          minMove: Math.pow(10, -decimals),
        },
      });
    } else {
      seriesRef.current = chartRef.current.addSeries(LineSeries, {
        color: '#22c55e',
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: decimals,
          minMove: Math.pow(10, -decimals),
        },
      });
    }

    // Re-apply existing data if we have it
    if (klinesRef.current.length > 0 && seriesRef.current) {
      const chartData = klinesRef.current.map(toChartData);
      seriesRef.current.setData(chartData);
      chartRef.current.timeScale().fitContent();
    }
  }, [chartType, decimals, toChartData]);

  // Fetch data and subscribe to updates
  useEffect(() => {
    if (!chartRef.current) return;

    setIsLoading(true);
    let isWsConnected = false; // Use local variable instead of state

    // Safety timeout - if data doesn't load in 10 seconds, stop showing loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Chart loading timeout - hiding loading indicator');
      setIsLoading(false);
    }, 10000);

    // Cleanup previous subscriptions
    if (wsUnsubscribeRef.current) {
      wsUnsubscribeRef.current();
      wsUnsubscribeRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }

    // Fetch historical data (500 candles)
    const fetchData = async () => {
      try {
        console.log(`Fetching ${symbol} ${timeframe} klines...`);
        const data = await binanceService.fetchKlines(symbol, timeframe, 500);
        console.log(`Fetched ${data.length} klines for ${symbol}`);
        
        clearTimeout(loadingTimeout); // Clear timeout on success
        klinesRef.current = data;
        
        if (seriesRef.current && data.length > 0) {
          const chartData = data.map(toChartData);
          seriesRef.current.setData(chartData);
          
          // Set initial price
          const last = data[data.length - 1];
          setCurrentPrice(last.close);
          const first = data[0];
          setPriceChange(((last.close - first.close) / first.close) * 100);
          
          // Fit content to view
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        }
        
        isWsConnected = true; // Mark as connected locally
        setWsConnected(true); // Update UI indicator
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch klines:', err);
        console.error('Error details:', err instanceof Error ? err.message : String(err));
        // Still set loading to false even on error
        setIsLoading(false);
      }
    };
    
    fetchData();

    // Subscribe to live updates with throttling
    const THROTTLE_MS = 200; // Max 5 updates/sec
    
    wsUnsubscribeRef.current = binanceService.subscribeKlines(symbol, timeframe, (newKline) => {
      const now = Date.now();
      if (now - lastUpdateRef.current < THROTTLE_MS) return;
      lastUpdateRef.current = now;

      isWsConnected = true; // Mark as connected locally
      setWsConnected(true); // Update UI indicator
      setCurrentPrice(newKline.close);

      const klines = klinesRef.current;
      const lastIndex = klines.length - 1;

      if (lastIndex >= 0 && klines[lastIndex].time === newKline.time) {
        // Update existing candle
        klines[lastIndex] = newKline;
        if (seriesRef.current) {
          seriesRef.current.update(toChartData(newKline));
        }
      } else if (lastIndex < 0 || newKline.time > klines[lastIndex].time) {
        // Add new candle
        klines.push(newKline);
        // Keep last 500 candles
        if (klines.length > 500) {
          klines.shift();
        }
        if (seriesRef.current) {
          seriesRef.current.update(toChartData(newKline));
        }
      }

      // Update price change
      if (klines.length > 1) {
        const first = klines[0];
        setPriceChange(((newKline.close - first.close) / first.close) * 100);
      }
    });

    // Fallback polling every 3s if WS disconnects
    fallbackIntervalRef.current = setInterval(async () => {
      if (!isWsConnected && seriesRef.current) {
        const latestData = await binanceService.fetchKlines(symbol, timeframe, 1);
        if (latestData.length > 0) {
          const newKline = latestData[0];
          const klines = klinesRef.current;
          const lastIndex = klines.length - 1;
          
          if (lastIndex >= 0 && klines[lastIndex].time === newKline.time) {
            klines[lastIndex] = newKline;
            seriesRef.current.update(toChartData(newKline));
          }
          setCurrentPrice(newKline.close);
        }
      }
    }, 3000);

    return () => {
      clearTimeout(loadingTimeout);
      if (wsUnsubscribeRef.current) {
        wsUnsubscribeRef.current();
        wsUnsubscribeRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, [symbol, timeframe, toChartData]); // Removed wsConnected - it was causing infinite loop!

  const formatPrice = (price: number) => {
    return binanceService.formatPrice(price, symbol);
  };

  const isPositive = priceChange >= 0;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{displayName}</h3>
            <div className="flex items-center gap-2">
              {currentPrice !== null ? (
                <span className="font-mono text-xl font-bold text-foreground">
                  ${formatPrice(currentPrice)}
                </span>
              ) : (
                <Skeleton className="h-7 w-24" />
              )}
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-primary" : "text-destructive"
              )}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
              {wsConnected && (
                <span className="flex items-center gap-1 text-xs text-primary ml-2">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  Live
                </span>
              )}
            </div>
          </div>
          
          {showControls && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Chart Type Toggle */}
              {onChartTypeChange && (
                <div className="flex gap-1 mr-2">
                  <Button
                    variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onChartTypeChange('candlestick')}
                  >
                    Candles
                  </Button>
                  <Button
                    variant={chartType === 'line' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onChartTypeChange('line')}
                  >
                    Line
                  </Button>
                </div>
              )}
              
              {/* Timeframe Controls */}
              {onTimeframeChange && (
                <div className="flex gap-1">
                  {TIMEFRAMES.map(tf => (
                    <Button
                      key={tf.value}
                      variant={timeframe === tf.value ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onTimeframeChange(tf.value)}
                    >
                      {tf.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* OHLC Tooltip */}
        {ohlc && chartType === 'candlestick' && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>O: <span className="text-foreground font-mono">{formatPrice(ohlc.o)}</span></span>
            <span>H: <span className="text-foreground font-mono">{formatPrice(ohlc.h)}</span></span>
            <span>L: <span className="text-foreground font-mono">{formatPrice(ohlc.l)}</span></span>
            <span>C: <span className="text-foreground font-mono">{formatPrice(ohlc.c)}</span></span>
          </div>
        )}

        {/* Chart Container - Always render but show loading overlay */}
        <div className="relative" style={{ height, minHeight: height }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Loading chart...</span>
              </div>
            </div>
          )}
          <div 
            ref={chartContainerRef} 
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </Card>
  );
}
