import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PositionWithPnL } from '@/hooks/useOpenPositions';
import { binanceService } from '@/services/binance';
import { cn } from '@/lib/utils';
import { X, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PositionsTableProps {
  positions: PositionWithPnL[];
  isLoading?: boolean;
  onClose?: (positionId: string) => void;
  isClosing?: boolean;
  compact?: boolean;
}

// Get hold time info based on seconds held
function getHoldTimeInfo(seconds: number) {
  if (seconds < 30) {
    return { credit: 0, color: 'text-destructive', bgColor: 'bg-destructive/20', label: '0%' };
  } else if (seconds < 60) {
    return { credit: 50, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20', label: '50%' };
  } else if (seconds < 180) {
    return { credit: 75, color: 'text-orange-500', bgColor: 'bg-orange-500/20', label: '75%' };
  } else {
    return { credit: 100, color: 'text-primary', bgColor: 'bg-primary/20', label: '100%' };
  }
}

// Format seconds to mm:ss
function formatHoldTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PositionsTable({ 
  positions, 
  isLoading, 
  onClose, 
  isClosing,
  compact 
}: PositionsTableProps) {
  const [now, setNow] = useState(new Date());

  // Update time every second for live timer
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No open positions</p>
        <p className="text-sm mt-1">Start trading to see your positions here</p>
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
    <TooltipProvider>
      <div className="overflow-x-auto -mx-1 md:mx-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs md:text-sm py-2 md:py-3">Symbol</TableHead>
              <TableHead className="text-muted-foreground text-xs md:text-sm py-2 md:py-3">Side</TableHead>
              <TableHead className="text-muted-foreground text-xs md:text-sm py-2 md:py-3">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Hold</span>
                </div>
              </TableHead>
              {!compact && <TableHead className="text-muted-foreground text-xs md:text-sm py-2 md:py-3 text-right">Entry</TableHead>}
              <TableHead className="text-muted-foreground text-xs md:text-sm py-2 md:py-3 text-right">Mark</TableHead>
              {!compact && <TableHead className="text-muted-foreground text-xs md:text-sm py-2 md:py-3 text-right">Leverage</TableHead>}
              <TableHead className="text-muted-foreground text-xs md:text-sm py-2 md:py-3 text-right">Margin</TableHead>
              <TableHead className="text-muted-foreground text-xs md:text-sm py-2 md:py-3 text-right">PnL</TableHead>
              {onClose && <TableHead className="text-muted-foreground w-8 md:w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((pos) => {
              const displayName = binanceService.SYMBOL_NAMES[pos.symbol] || pos.symbol;
              const isProfit = pos.unrealizedPnL >= 0;
              
              // Calculate hold time
              const openedAt = new Date(pos.opened_at);
              const holdSeconds = Math.max(0, Math.floor((now.getTime() - openedAt.getTime()) / 1000));
              const holdInfo = getHoldTimeInfo(holdSeconds);
              
              return (
                <TableRow key={pos.id} className="border-border">
                  <TableCell className="font-medium text-foreground text-xs md:text-sm py-2 md:py-3">
                    {displayName}
                  </TableCell>
                  <TableCell className="py-2 md:py-3">
                    <span className={cn(
                      "px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-medium",
                      pos.side === 'long' 
                        ? "bg-primary/20 text-primary" 
                        : "bg-destructive/20 text-destructive"
                    )}>
                      {pos.side.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 md:py-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-mono text-xs", holdInfo.color)}>
                            {formatHoldTime(holdSeconds)}
                          </span>
                          <span className={cn(
                            "px-1 py-0.5 rounded text-[10px] font-medium",
                            holdInfo.bgColor,
                            holdInfo.color
                          )}>
                            {holdInfo.label}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="text-xs space-y-1">
                          <p className="font-medium">Volume Credit: {holdInfo.label}</p>
                          <p className="text-muted-foreground">
                            {holdSeconds < 30 
                              ? `Hold ${30 - holdSeconds}s more for 50% credit`
                              : holdSeconds < 60
                              ? `Hold ${60 - holdSeconds}s more for 75% credit`
                              : holdSeconds < 180
                              ? `Hold ${180 - holdSeconds}s more for 100% credit`
                              : 'Maximum credit achieved!'}
                          </p>
                          <div className="border-t border-border pt-1 mt-1 text-muted-foreground">
                            <p>• &lt;30s: 0% (anti-spam)</p>
                            <p>• 30-60s: 50%</p>
                            <p>• 60-180s: 75%</p>
                            <p>• ≥180s: 100%</p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  {!compact && (
                    <TableCell className="text-right font-mono text-foreground text-xs md:text-sm py-2 md:py-3">
                      ${formatNumber(pos.entry_price)}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono text-foreground text-xs md:text-sm py-2 md:py-3">
                    ${formatNumber(pos.markPrice)}
                  </TableCell>
                  {!compact && (
                    <TableCell className="text-right text-foreground text-xs md:text-sm py-2 md:py-3">
                      {pos.leverage}x
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono text-foreground text-xs md:text-sm py-2 md:py-3">
                    ${formatNumber(pos.margin)}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-mono font-medium py-2 md:py-3",
                    isProfit ? "text-primary" : "text-destructive"
                  )}>
                    <div className="text-xs md:text-sm">{isProfit ? '+' : ''}{formatNumber(pos.unrealizedPnL)}</div>
                    <div className="text-[10px] md:text-xs">
                      ({isProfit ? '+' : ''}{formatNumber(pos.pnlPercent)}%)
                    </div>
                  </TableCell>
                  {onClose && (
                    <TableCell className="py-2 md:py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onClose(pos.id)}
                        disabled={isClosing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
