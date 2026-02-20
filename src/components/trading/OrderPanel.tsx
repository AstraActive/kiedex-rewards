import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMarketPrice } from '@/hooks/useMarketPrices';
import { useBalances } from '@/hooks/useBalances';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { binanceService } from '@/services/binance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle, Info } from 'lucide-react';

interface OrderPanelProps {
  symbol: string;
}

const MIN_MARGIN = 5; // Minimum margin in USDT
const MAX_LEVERAGE = 50;
const SLIPPAGE_RATE = 0.03; // 0.03% display
const RETRY_DELAY_MS = 1000;

export function OrderPanel({ symbol }: OrderPanelProps) {
  const { user, session } = useAuth();
  const { linkedWalletAddress, walletMismatch } = useWallet();
  // Trading only requires a linked wallet address (stored in DB).
  // The execute-trade edge function verifies the user's JWT server-side,
  // so an active wagmi session is NOT required to place trades.
  const isWalletReady = !!linkedWalletAddress;
  const { ticker } = useMarketPrice(symbol);
  const { data: balances, isLoading: balancesLoading } = useBalances();
  const queryClient = useQueryClient();

  const [side, setSide] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState(10);
  const [margin, setMargin] = useState('');

  const markPrice = ticker ? parseFloat(ticker.price) : 0;
  const marginNum = parseFloat(margin) || 0;
  const availableBalance = balances?.demo_usdt_balance || 0;
  const oilBalance = balances?.oil_balance || 0;

  // Dynamic fee: 1 USDT position size = 1 Oil fee
  const positionSizeUsdt = marginNum * leverage;
  const feeOil = Math.ceil(positionSizeUsdt);

  const hasEnoughOil = feeOil > 0 ? oilBalance >= feeOil : true;
  const hasEnoughMargin = marginNum >= MIN_MARGIN && marginNum <= availableBalance;

  const calculations = useMemo(() => {
    const positionSize = (marginNum * leverage) / markPrice;

    // Liquidation price calculation (simplified)
    const maintenanceMargin = marginNum * 0.5; // 50% maintenance margin
    const liquidationDistance = maintenanceMargin / positionSize;
    const liquidationPrice = side === 'long'
      ? markPrice - liquidationDistance
      : markPrice + liquidationDistance;

    return {
      positionSize,
      liquidationPrice: Math.max(0, liquidationPrice),
    };
  }, [marginNum, leverage, markPrice, side]);

  // Frontend validation before API call
  const validateOrder = useCallback((): string | null => {
    // Authentication checks
    if (!user?.id) {
      return 'Not authenticated. Please log in.';
    }
    if (!session?.access_token) {
      return 'Session expired. Please log in again.';
    }

    // Wallet checks
    if (!linkedWalletAddress) {
      return 'No wallet linked. Please connect your wallet first.';
    }
    if (!isWalletReady) {
      return 'Wallet not ready. Please wait a moment and try again.';
    }
    if (walletMismatch) {
      return 'Connected wallet does not match linked wallet. Please switch wallets.';
    }

    // Order validation - use symbols from binance service
    if (!binanceService.SYMBOLS.includes(symbol as typeof binanceService.SYMBOLS[number])) {
      return `Invalid trading pair: ${symbol}`;
    }
    if (marginNum < MIN_MARGIN) {
      return `Minimum margin is ${MIN_MARGIN} USDT`;
    }
    if (marginNum > availableBalance) {
      return `Insufficient USDT balance. Have ${availableBalance.toFixed(2)}, need ${marginNum.toFixed(2)}`;
    }
    if (leverage < 1 || leverage > MAX_LEVERAGE) {
      return `Leverage must be between 1x and ${MAX_LEVERAGE}x`;
    }
    if (!hasEnoughOil) {
      return `Insufficient Oil. Need ${feeOil.toLocaleString()} Oil for this trade.`;
    }
    if (markPrice <= 0) {
      return 'Market price unavailable. Please wait for price data.';
    }

    return null; // No errors
  }, [user, session, linkedWalletAddress, isWalletReady, walletMismatch, symbol, marginNum, availableBalance, leverage, hasEnoughOil, feeOil, markPrice]);

  // Execute trade with retry logic for server errors
  const executeTradeWithRetry = useCallback(async (retryCount = 0): Promise<unknown> => {
    const { data, error } = await supabase.functions.invoke('execute-trade', {
      body: {
        symbol,
        side,
        leverage,
        margin: marginNum,
      },
    });

    // Handle SDK-level errors (network issues, timeouts)
    if (error) {
      console.error('Trade execution SDK error:', error);

      // Check if it's a retryable server error (5xx)
      const errorMessage = error.message || '';
      const isServerError =
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504') ||
        errorMessage.includes('FunctionsHttpError');

      if (isServerError && retryCount < 1) {
        console.log('Retrying trade after server error...');
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        return executeTradeWithRetry(retryCount + 1);
      }

      throw new Error(error.message || 'Failed to connect to trading server');
    }

    // Handle application-level errors from our edge function
    if (!data?.success) {
      const errorMsg = data?.error || 'Failed to execute trade';
      console.error('Trade execution app error:', errorMsg);
      throw new Error(errorMsg);
    }

    return data.data;
  }, [symbol, side, leverage, marginNum]);

  const openPositionMutation = useMutation({
    mutationFn: async () => {
      // Run frontend validation first
      const validationError = validateOrder();
      if (validationError) {
        throw new Error(validationError);
      }

      // Execute with retry logic
      return executeTradeWithRetry();
    },
    onSuccess: (data: unknown) => {
      const tradeData = data as { side: string; margin: number; leverage: number };
      toast.success(`${tradeData.side.toUpperCase()} position opened`, {
        description: `$${tradeData.margin} margin at ${tradeData.leverage}x leverage (slippage applied)`,
      });
      setMargin('');
      queryClient.invalidateQueries({ queryKey: ['open_positions'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
    onError: (error: Error) => {
      console.error('Trade execution failed:', error.message);
      toast.error('Failed to open position', {
        description: error.message,
        duration: 5000,
      });
    },
  });

  const displayName = binanceService.SYMBOL_NAMES[symbol] || symbol;

  // Show wallet mismatch warning
  const showWalletWarning = walletMismatch;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-lg text-foreground">
            Open Position - {displayName}
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground cursor-help">
                  <Info className="h-3 w-3" />
                  <span>Slippage: {SLIPPAGE_RATE}%</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-xs">Slippage simulates real market execution and prevents spam trading.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        {/* Wallet Mismatch Warning */}
        {showWalletWarning && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Connected wallet doesn't match linked wallet. Please switch wallets to trade.
            </AlertDescription>
          </Alert>
        )}

        {/* Mark Price */}
        <div className="flex justify-between items-center">
          <span className="text-xs md:text-sm text-muted-foreground">Mark Price</span>
          <span className="font-mono text-base md:text-lg font-semibold text-foreground">
            ${binanceService.formatPrice(markPrice, symbol)}
          </span>
        </div>

        {/* Side Selector */}
        <div className="grid grid-cols-2 gap-1.5 md:gap-2">
          <Button
            variant={side === 'long' ? 'default' : 'outline'}
            className={cn(
              "h-9 md:h-10 text-sm md:text-base",
              side === 'long' && 'bg-primary hover:bg-primary/90'
            )}
            onClick={() => setSide('long')}
          >
            Long
          </Button>
          <Button
            variant={side === 'short' ? 'default' : 'outline'}
            className={cn(
              "h-9 md:h-10 text-sm md:text-base",
              side === 'short' && 'bg-destructive hover:bg-destructive/90'
            )}
            onClick={() => setSide('short')}
          >
            Short
          </Button>
        </div>

        {/* Leverage Slider */}
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-foreground text-xs md:text-sm">Leverage</Label>
            <span className="font-mono text-sm md:text-base font-semibold text-primary">{leverage}x</span>
          </div>
          <Slider
            value={[leverage]}
            onValueChange={(vals) => setLeverage(vals[0])}
            min={1}
            max={50}
            step={1}
            className="py-1.5 md:py-2"
          />
          <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
            <span>1x</span>
            <span>25x</span>
            <span>50x</span>
          </div>
        </div>

        {/* Margin Input */}
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-foreground text-xs md:text-sm">Margin (USDT)</Label>
            <span className="text-[10px] md:text-xs text-muted-foreground">
              Available: ${availableBalance.toFixed(2)}
            </span>
          </div>
          <Input
            type="number"
            placeholder="Enter margin amount"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            className="font-mono h-9 md:h-10 text-sm"
          />
          <div className="flex gap-1.5 md:gap-2">
            {[25, 50, 75, 100].map((pct) => (
              <Button
                key={pct}
                variant="outline"
                size="sm"
                className="flex-1 h-6 md:h-7 text-[10px] md:text-xs"
                onClick={() => setMargin((availableBalance * pct / 100).toFixed(2))}
              >
                {pct}%
              </Button>
            ))}
          </div>
        </div>

        {/* Position Details */}
        {marginNum > 0 && markPrice > 0 && (
          <div className="space-y-1.5 md:space-y-2 p-2 md:p-3 bg-secondary/50 rounded-md">
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Position Size</span>
              <span className="font-mono text-foreground">
                {calculations.positionSize.toFixed(6)} {symbol.replace('USDT', '')}
              </span>
            </div>
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Est. Liquidation</span>
              <span className="font-mono text-foreground">
                ${calculations.liquidationPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">Trading Fee</span>
              <span className="font-mono text-amber-400 font-semibold">
                🛢️ {feeOil.toLocaleString()} Oil
              </span>
            </div>
          </div>
        )}

        {/* Oil Balance Display */}
        <div className="flex justify-between items-center text-xs md:text-sm p-1.5 md:p-2 bg-secondary/30 rounded-md">
          <span className="text-muted-foreground">🛢️ Oil Balance</span>
          <span className="font-mono text-foreground">{oilBalance.toLocaleString()} Oil</span>
        </div>

        {/* Low Oil Warning */}
        {marginNum > 0 && !hasEnoughOil && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Insufficient Oil. Need {feeOil.toLocaleString()} Oil for this trade.</span>
              <Link to="/wallet" className="text-primary underline ml-2">
                Recharge Oil →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Open Position Button */}
        <Button
          className={cn(
            "w-full text-base md:text-lg font-semibold h-10 md:h-11",
            side === 'long'
              ? "bg-primary hover:bg-primary/90"
              : "bg-destructive hover:bg-destructive/90"
          )}
          disabled={!hasEnoughMargin || !hasEnoughOil || openPositionMutation.isPending || showWalletWarning || !isWalletReady}
          onClick={() => openPositionMutation.mutate()}
        >
          {openPositionMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {openPositionMutation.isPending ? 'Opening...' : `Open ${side.charAt(0).toUpperCase() + side.slice(1)}`}
        </Button>
      </CardContent>
    </Card>
  );
}
