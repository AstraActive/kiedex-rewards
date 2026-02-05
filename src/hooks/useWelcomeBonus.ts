import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useWelcomeBonus() {
  const { user } = useAuth();
  const hasShownToast = useRef(false);

  const { data: welcomeBonus } = useQuery({
    queryKey: ['welcome_bonus', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('bonus_claims')
        .select('*')
        .eq('user_id', user.id)
        .eq('bonus_type', 'WELCOME_OIL')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!welcomeBonus || hasShownToast.current) return;
    
    // Show toast only if bonus was claimed within last 30 seconds (new user)
    const claimedAt = new Date(welcomeBonus.created_at);
    const now = new Date();
    const diffSeconds = (now.getTime() - claimedAt.getTime()) / 1000;
    
    if (diffSeconds < 30) {
      hasShownToast.current = true;
      toast.success(`Welcome bonus added: +${welcomeBonus.amount_oil} 🛢️ Oil`, {
        description: 'Start trading with your free Oil credits!',
        duration: 5000,
      });
    }
  }, [welcomeBonus]);

  return { welcomeBonus };
}
