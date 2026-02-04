import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OilDeposit {
  id: string;
  user_id: string;
  wallet_address: string;
  tx_hash: string;
  eth_amount: number;
  oil_credited: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
}

export function useOilDeposits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['oil_deposits', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('oil_deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as OilDeposit[];
    },
    enabled: !!user?.id,
  });
}
