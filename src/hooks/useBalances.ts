import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useBalances() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['balances', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('balances')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000, // 30 seconds - data considered fresh
    gcTime: 5 * 60_000, // 5 minutes - keep in cache
  });
}
