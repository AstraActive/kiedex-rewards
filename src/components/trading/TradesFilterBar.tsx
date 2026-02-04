import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { binanceService } from '@/services/binance';
import { TradesFilters } from '@/hooks/usePaginatedTradesHistory';

interface TradesFilterBarProps {
  filters: TradesFilters;
  onFiltersChange: (filters: TradesFilters) => void;
}

export function TradesFilterBar({ filters, onFiltersChange }: TradesFilterBarProps) {
  const updateFilter = <K extends keyof TradesFilters>(key: K, value: TradesFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {/* Symbol Filter */}
      <Select
        value={filters.symbol || 'all'}
        onValueChange={(v) => updateFilter('symbol', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[120px] h-8 text-xs bg-secondary border-border">
          <SelectValue placeholder="All Pairs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Pairs</SelectItem>
          {binanceService.SYMBOLS.map((symbol) => (
            <SelectItem key={symbol} value={symbol}>
              {binanceService.SYMBOL_NAMES[symbol]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Side Filter */}
      <Select
        value={filters.side || 'all'}
        onValueChange={(v) => updateFilter('side', v === 'all' ? null : v as 'long' | 'short')}
      >
        <SelectTrigger className="w-[100px] h-8 text-xs bg-secondary border-border">
          <SelectValue placeholder="All Sides" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sides</SelectItem>
          <SelectItem value="long">LONG</SelectItem>
          <SelectItem value="short">SHORT</SelectItem>
        </SelectContent>
      </Select>

      {/* Time Filter */}
      <Select
        value={filters.timeRange || 'all'}
        onValueChange={(v) => updateFilter('timeRange', v as TradesFilters['timeRange'])}
      >
        <SelectTrigger className="w-[90px] h-8 text-xs bg-secondary border-border">
          <SelectValue placeholder="All Time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7d">7 Days</SelectItem>
          <SelectItem value="30d">30 Days</SelectItem>
        </SelectContent>
      </Select>

      {/* PnL Filter */}
      <Select
        value={filters.pnlFilter || 'all'}
        onValueChange={(v) => updateFilter('pnlFilter', v as TradesFilters['pnlFilter'])}
      >
        <SelectTrigger className="w-[100px] h-8 text-xs bg-secondary border-border">
          <SelectValue placeholder="All PnL" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All PnL</SelectItem>
          <SelectItem value="profit">Profit Only</SelectItem>
          <SelectItem value="loss">Loss Only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
