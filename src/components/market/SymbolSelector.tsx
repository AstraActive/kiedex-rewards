import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { binanceService } from '@/services/binance';

interface SymbolSelectorProps {
  value: string;
  onValueChange: (symbol: string) => void;
  className?: string;
}

export function SymbolSelector({ value, onValueChange, className }: SymbolSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select market" />
      </SelectTrigger>
      <SelectContent>
        {binanceService.SYMBOLS.map(symbol => (
          <SelectItem key={symbol} value={symbol}>
            {binanceService.SYMBOL_NAMES[symbol]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
