import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Partner {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  description: string | null;
  display_order: number;
}

export function usePartners() {
  return useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('partners')
        .select('id, name, logo_url, website_url, description, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Partner[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
