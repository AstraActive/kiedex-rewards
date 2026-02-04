import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TradeHistory } from './useTradesHistory';
import { startOfDay, subDays } from 'date-fns';

export interface TradesFilters {
  symbol?: string | null;
  side?: 'long' | 'short' | null;
  timeRange?: 'today' | '7d' | '30d' | 'all';
  pnlFilter?: 'all' | 'profit' | 'loss';
}

interface UsePaginatedTradesHistoryOptions {
  page: number;
  pageSize: number;
  filters?: TradesFilters;
}

export function usePaginatedTradesHistory({ page, pageSize, filters }: UsePaginatedTradesHistoryOptions) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trades_history_paginated', user?.id, page, pageSize, filters],
    queryFn: async () => {
      if (!user?.id) return { trades: [], totalCount: 0, totalPages: 0 };

      // Build base query for count
      let countQuery = supabase
        .from('trades_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Build data query
      let dataQuery = supabase
        .from('trades_history')
        .select('*')
        .eq('user_id', user.id);

      // Apply filters
      if (filters?.symbol) {
        countQuery = countQuery.eq('symbol', filters.symbol);
        dataQuery = dataQuery.eq('symbol', filters.symbol);
      }

      if (filters?.side) {
        countQuery = countQuery.eq('side', filters.side);
        dataQuery = dataQuery.eq('side', filters.side);
      }

      if (filters?.timeRange && filters.timeRange !== 'all') {
        let startDate: Date;
        const now = new Date();
        
        switch (filters.timeRange) {
          case 'today':
            startDate = startOfDay(now);
            break;
          case '7d':
            startDate = subDays(now, 7);
            break;
          case '30d':
            startDate = subDays(now, 30);
            break;
          default:
            startDate = new Date(0);
        }
        
        const isoDate = startDate.toISOString();
        countQuery = countQuery.gte('closed_at', isoDate);
        dataQuery = dataQuery.gte('closed_at', isoDate);
      }

      if (filters?.pnlFilter && filters.pnlFilter !== 'all') {
        if (filters.pnlFilter === 'profit') {
          countQuery = countQuery.gt('realized_pnl', 0);
          dataQuery = dataQuery.gt('realized_pnl', 0);
        } else if (filters.pnlFilter === 'loss') {
          countQuery = countQuery.lt('realized_pnl', 0);
          dataQuery = dataQuery.lt('realized_pnl', 0);
        }
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Get paginated data
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await dataQuery
        .order('closed_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        trades: data as TradeHistory[],
        totalCount,
        totalPages,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds cache
  });
}
