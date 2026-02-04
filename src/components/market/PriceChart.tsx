import { useState } from 'react';
import { TradingViewChart } from './TradingViewChart';
import { TimeFrame } from '@/hooks/useKlines';

interface PriceChartProps {
  symbol: string;
  timeframe: TimeFrame;
  onTimeframeChange?: (tf: TimeFrame) => void;
  height?: number;
  showControls?: boolean;
}

export function PriceChart({ 
  symbol, 
  timeframe, 
  onTimeframeChange,
  height = 300,
  showControls = true,
}: PriceChartProps) {
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');

  return (
    <TradingViewChart
      symbol={symbol}
      timeframe={timeframe}
      onTimeframeChange={onTimeframeChange}
      height={height}
      showControls={showControls}
      chartType={chartType}
      onChartTypeChange={setChartType}
    />
  );
}
