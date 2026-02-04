import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAllMarketPrices } from './useMarketPrices';
import { useMemo } from 'react';
import { toast } from 'sonner';

export interface OpenPosition {
  id: string;
  symbol: string;
  side: string;
  entry_price: number;
  entry_price_executed?: number;
  leverage: number;
  margin: number;
  position_size: number;
  liquidation_price: number;
  fee_paid: number;
  opened_at: string;
  user_id: string;
  slippage_rate?: number;
}

export interface PositionWithPnL extends OpenPosition {
  markPrice: number;
  unrealizedPnL: number;
  pnlPercent: number;
  roe: number;
}

export function useOpenPositions() {
  const { user } = useAuth();
  const { tickers } = useAllMarketPrices();
  const queryClient = useQueryClient();

  const { data: positions, isLoading, error } = useQuery({
    queryKey: ['open_positions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('open_positions')
        .select('*')
        .eq('user_id', user.id)
        .order('opened_at', { ascending: false });
      
      if (error) throw error;
      return data as OpenPosition[];
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
    staleTime: 2000, // 2 seconds - positions need frequent updates
    gcTime: 60_000, // 1 minute cache
  });

  // Calculate PnL for each position based on live market prices
  // Note: Unrealized PnL uses mark price for smooth UI display
  const positionsWithPnL = useMemo((): PositionWithPnL[] => {
    if (!positions) return [];

    return positions.map(pos => {
      const ticker = tickers.get(pos.symbol);
      const markPrice = ticker ? parseFloat(ticker.price) : pos.entry_price;
      
      // Use entry_price for unrealized PnL display (not executed price)
      // This gives a smoother UI experience
      const priceDiff = pos.side === 'long' 
        ? markPrice - pos.entry_price 
        : pos.entry_price - markPrice;
      
      const unrealizedPnL = priceDiff * pos.position_size;
      const pnlPercent = (unrealizedPnL / pos.margin) * 100;
      const roe = pnlPercent; // ROE equals PnL% for isolated margin

      return {
        ...pos,
        markPrice,
        unrealizedPnL,
        pnlPercent,
        roe,
      };
    });
  }, [positions, tickers]);

  // Close position mutation - now uses edge function for server-side calculation
  const closePositionMutation = useMutation({
    mutationFn: async (positionId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Call close-trade edge function for server-side execution with slippage
      const { data, error } = await supabase.functions.invoke('close-trade', {
        body: { positionId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to close trade');

      return data.data;
    },
    onSuccess: (data) => {
      const pnlColor = data.realizedPnl >= 0 ? 'text-primary' : 'text-destructive';
      const pnlSign = data.realizedPnl >= 0 ? '+' : '';
      
      toast.success('Position closed', {
        description: `PnL: ${pnlSign}$${data.realizedPnl.toFixed(2)} | Open time: ${data.openTimeSeconds}s`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['open_positions'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['trades_history'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['user_rank'] });
      queryClient.invalidateQueries({ queryKey: ['trading_stats'] });
      queryClient.invalidateQueries({ queryKey: ['today_stats'] });
      queryClient.invalidateQueries({ queryKey: ['total_volume'] });
    },
    onError: (error) => {
      toast.error('Failed to close position', {
        description: error.message,
      });
    },
  });

  const totalUnrealizedPnL = useMemo(() => {
    return positionsWithPnL.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  }, [positionsWithPnL]);

  return {
    positions: positionsWithPnL,
    isLoading,
    error,
    closePosition: closePositionMutation.mutate,
    isClosing: closePositionMutation.isPending,
    totalUnrealizedPnL,
  };
}
