import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type LeaderboardType = 'volume' | 'pnl' | 'winrate';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  date: string;
  total_volume: number;
  total_counted_volume: number;
  total_pnl: number;
  trade_count: number;
  win_count: number;
  updated_at: string;
  rank?: number;
  username?: string;
  winRate?: number;
}

function getDateRange(period: LeaderboardPeriod): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  
  let startDate: string;
  
  if (period === 'daily') {
    startDate = endDate;
  } else if (period === 'weekly') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6); // Last 7 days including today
    startDate = weekAgo.toISOString().split('T')[0];
  } else {
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 29); // Last 30 days including today
    startDate = monthAgo.toISOString().split('T')[0];
  }
  
  return { startDate, endDate };
}

export function useLeaderboard(type: LeaderboardType = 'volume', period: LeaderboardPeriod = 'daily') {
  const { user } = useAuth();
  const { startDate, endDate } = getDateRange(period);

  return useQuery({
    queryKey: ['leaderboard', type, period, startDate, endDate],
    queryFn: async () => {
      // For weekly/monthly, we need to aggregate across multiple days
      const { data, error } = await supabase
        .from('leaderboard_daily')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (error) throw error;
      
      // Aggregate by user_id for weekly/monthly
      const userMap = new Map<string, {
        user_id: string;
        total_volume: number;
        total_counted_volume: number;
        total_pnl: number;
        trade_count: number;
        win_count: number;
      }>();
      
      (data || []).forEach(entry => {
        const existing = userMap.get(entry.user_id);
        if (existing) {
          existing.total_volume += entry.total_volume;
          existing.total_counted_volume += (entry.total_counted_volume || 0);
          existing.total_pnl += entry.total_pnl;
          existing.trade_count += entry.trade_count;
          existing.win_count += entry.win_count;
        } else {
          userMap.set(entry.user_id, {
            user_id: entry.user_id,
            total_volume: entry.total_volume,
            total_counted_volume: entry.total_counted_volume || 0,
            total_pnl: entry.total_pnl,
            trade_count: entry.trade_count,
            win_count: entry.win_count,
          });
        }
      });
      
      // Convert to array and calculate win rate
      let entries: LeaderboardEntry[] = Array.from(userMap.values()).map((entry, index) => ({
        id: entry.user_id,
        user_id: entry.user_id,
        date: endDate,
        total_volume: entry.total_volume,
        total_counted_volume: entry.total_counted_volume,
        total_pnl: entry.total_pnl,
        trade_count: entry.trade_count,
        win_count: entry.win_count,
        updated_at: new Date().toISOString(),
        rank: index + 1,
        winRate: entry.trade_count > 0 
          ? (entry.win_count / entry.trade_count) * 100 
          : 0,
      }));

      // Sort based on type - use counted_volume for volume ranking
      if (type === 'volume') {
        entries.sort((a, b) => b.total_counted_volume - a.total_counted_volume);
      } else if (type === 'pnl') {
        entries.sort((a, b) => b.total_pnl - a.total_pnl);
      } else if (type === 'winrate') {
        // Filter to only show users with 3+ trades for win rate
        entries = entries.filter(e => e.trade_count >= 3);
        entries.sort((a, b) => (b.winRate || 0) - (a.winRate || 0));
      }
      
      // Reassign ranks after sorting
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });
      
      // Limit to top 100
      return entries.slice(0, 100);
    },
    staleTime: 30_000, // 30 seconds - leaderboard doesn't need instant updates
    gcTime: 5 * 60_000, // 5 minutes cache
    retry: 3, // Retry 3 times on failure
  });
}

export function useUserRank(period: LeaderboardPeriod = 'daily') {
  const { user } = useAuth();
  const { startDate, endDate } = getDateRange(period);

  return useQuery({
    queryKey: ['user_rank', user?.id, period, startDate, endDate],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get user's aggregated stats for the period
      const { data: userEntries, error: userError } = await supabase
        .from('leaderboard_daily')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (userError) throw userError;
      if (!userEntries || userEntries.length === 0) return null;

      // Aggregate user's stats
      const userStats = userEntries.reduce((acc, entry) => ({
        total_volume: acc.total_volume + entry.total_volume,
        total_counted_volume: acc.total_counted_volume + (entry.total_counted_volume || 0),
        total_pnl: acc.total_pnl + entry.total_pnl,
        trade_count: acc.trade_count + entry.trade_count,
        win_count: acc.win_count + entry.win_count,
      }), { total_volume: 0, total_counted_volume: 0, total_pnl: 0, trade_count: 0, win_count: 0 });

      // Get all entries for the period to calculate rank (using counted_volume)
      const { data: allEntries, error: allError } = await supabase
        .from('leaderboard_daily')
        .select('user_id, total_counted_volume')
        .gte('date', startDate)
        .lte('date', endDate);

      if (allError) throw allError;

      // Aggregate all users by counted volume
      const userVolumes = new Map<string, number>();
      (allEntries || []).forEach(entry => {
        userVolumes.set(
          entry.user_id, 
          (userVolumes.get(entry.user_id) || 0) + (entry.total_counted_volume || 0)
        );
      });

      // Count users with higher counted volume
      let rank = 1;
      userVolumes.forEach((volume, id) => {
        if (id !== user.id && volume > userStats.total_counted_volume) {
          rank++;
        }
      });

      return {
        ...userStats,
        user_id: user.id,
        rank,
        winRate: userStats.trade_count > 0 
          ? (userStats.win_count / userStats.trade_count) * 100 
          : 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes cache
  });
}
