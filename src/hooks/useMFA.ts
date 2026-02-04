import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MFAStatus {
  id: string;
  user_id: string;
  is_enabled: boolean;
  enabled_at: string | null;
  last_used_at: string | null;
}

interface MFAEnrollmentData {
  factorId: string;
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export function useMFA() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch MFA status
  const { data: mfaStatus, isLoading } = useQuery({
    queryKey: ['mfa_status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_mfa')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as MFAStatus | null;
    },
    enabled: !!user?.id,
  });

  // Enroll in MFA (generate QR code and secret)
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Enroll using Supabase Auth MFA
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'KieDex Authenticator',
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to generate MFA enrollment');

      // Generate backup codes (10 codes, 8 characters each)
      const backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      return {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        backupCodes,
      } as MFAEnrollmentData;
    },
    onError: (error) => {
      console.error('MFA enrollment error:', error);
      toast({
        title: 'Enrollment Failed',
        description: error instanceof Error ? error.message : 'Failed to start MFA setup',
        variant: 'destructive',
      });
    },
  });

  // Verify and enable MFA
  const verifyMutation = useMutation({
    mutationFn: async ({ 
      factorId, 
      code, 
      backupCodes,
      secret 
    }: { 
      factorId: string; 
      code: string; 
      backupCodes: string[];
      secret: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Verify the TOTP code
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      // Hash backup codes before storing (simple hash for demo - use bcrypt in production)
      const hashedCodes = backupCodes.map(code => 
        btoa(code + user.id) // Simple encoding - replace with proper hashing
      );

      // Save MFA status to database
      const { error: dbError } = await supabase
        .from('user_mfa')
        .upsert({
          user_id: user.id,
          secret: secret,
          is_enabled: true,
          backup_codes: hashedCodes,
          enabled_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (dbError) throw dbError;

      return { success: true, backupCodes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa_status'] });
      toast({
        title: '2FA Enabled',
        description: 'Two-factor authentication has been successfully enabled.',
      });
    },
    onError: (error) => {
      console.error('MFA verification error:', error);
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Invalid verification code',
        variant: 'destructive',
      });
    },
  });

  // Disable MFA
  const disableMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!user?.id || !user?.email) throw new Error('Not authenticated');

      // Verify password before disabling
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) throw new Error('Invalid password');

      // Get all MFA factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      // Unenroll all factors
      if (factors?.totp && factors.totp.length > 0) {
        for (const factor of factors.totp) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      // Update database
      const { error: dbError } = await supabase
        .from('user_mfa')
        .update({
          is_enabled: false,
          backup_codes: null,
        })
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa_status'] });
      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled.',
      });
    },
    onError: (error) => {
      console.error('MFA disable error:', error);
      toast({
        title: 'Failed to Disable',
        description: error instanceof Error ? error.message : 'Failed to disable 2FA',
        variant: 'destructive',
      });
    },
  });

  return {
    mfaStatus,
    isLoading,
    isEnabled: mfaStatus?.is_enabled || false,
    enroll: enrollMutation.mutate,
    isEnrolling: enrollMutation.isPending,
    enrollmentData: enrollMutation.data,
    verify: verifyMutation.mutate,
    isVerifying: verifyMutation.isPending,
    disable: disableMutation.mutate,
    isDisabling: disableMutation.isPending,
  };
}
