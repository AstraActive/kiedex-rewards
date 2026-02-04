import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TradeHistory {
  id: string;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number | null;
  leverage: number;
  margin: number;
  position_size: number;
  fee_paid: number;
  realized_pnl: number | null;
  status: string;
  opened_at: string;
  closed_at: string;
  user_id: string;
}

export function useTradesHistory(limit?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trades_history', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('trades_history')
        .select('*')
        .eq('user_id', user.id)
        .order('closed_at', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TradeHistory[];
    },
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes cache
  });
}

export function useTradingStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trading_stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('trades_history')
        .select('realized_pnl, margin')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const trades = data || [];
      const totalTrades = trades.length;
      const winningTrades = trades.filter(t => (t.realized_pnl || 0) > 0).length;
      const totalPnL = trades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
      const totalVolume = trades.reduce((sum, t) => sum + t.margin, 0);
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      return {
        totalTrades,
        winningTrades,
        losingTrades: totalTrades - winningTrades,
        totalPnL,
        totalVolume,
        winRate,
      };
    },
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes cache
  });
}
