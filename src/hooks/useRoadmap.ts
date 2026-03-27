import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RoadmapStatus = 'completed' | 'live' | 'in_progress' | 'coming' | 'planned' | 'future';

export interface RoadmapPhase {
  id: string;
  phase_number: number;
  title: string;
  description: string | null;
  status: RoadmapStatus;
  display_order: number;
}

export function useRoadmap() {
  return useQuery({
    queryKey: ['roadmap'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('roadmap_phases')
        .select('id, phase_number, title, description, status, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as RoadmapPhase[];
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
