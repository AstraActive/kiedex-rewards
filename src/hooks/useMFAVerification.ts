import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useMFAVerification() {
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);

  const checkMFAStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_mfa')
        .select('is_enabled')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[MFA] Error checking MFA status:', error);
        return false;
      }

      return data?.is_enabled || false;
    } catch (err) {
      console.error('[MFA] Error checking MFA status:', err);
      return false;
    }
  }, []);

  const verifyMFACode = useCallback(async (
    code: string, 
    isBackupCode: boolean = false
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Not authenticated');
      return false;
    }

    setIsVerifying(true);

    try {
      if (isBackupCode) {
        // Verify backup code
        const { data: mfaData, error: mfaError } = await supabase
          .from('user_mfa')
          .select('backup_codes')
          .eq('user_id', user.id)
          .single();

        if (mfaError || !mfaData?.backup_codes) {
          toast.error('No backup codes found');
          return false;
        }

        // Check if the provided code matches any backup code
        const hashedCode = btoa(code + user.id);
        const isValid = mfaData.backup_codes.some((stored: string) => stored === hashedCode);

        if (!isValid) {
          toast.error('Invalid backup code');
          return false;
        }

        // Remove used backup code
        const updatedBackupCodes = mfaData.backup_codes.filter((c: string) => c !== hashedCode);
        
        await supabase
          .from('user_mfa')
          .update({ 
            backup_codes: updatedBackupCodes,
            last_used_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        toast.success('Backup code verified successfully');
        return true;
      } else {
        // Verify TOTP code
        const { data: factors } = await supabase.auth.mfa.listFactors();
        
        if (!factors?.totp || factors.totp.length === 0) {
          toast.error('No MFA factors found');
          return false;
        }

        const factor = factors.totp[0];
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: factor.id,
        });

        if (challengeError) {
          console.error('[MFA] Challenge error:', challengeError);
          toast.error('Failed to create MFA challenge');
          return false;
        }

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: factor.id,
          challengeId: challengeData.id,
          code,
        });

        if (verifyError) {
          console.error('[MFA] Verification error:', verifyError);
          toast.error('Invalid verification code');
          return false;
        }

        // Update last_used_at
        await supabase
          .from('user_mfa')
          .update({ last_used_at: new Date().toISOString() })
          .eq('user_id', user.id);

        toast.success('Verification successful');
        return true;
      }
    } catch (err) {
      console.error('[MFA] Verification error:', err);
      toast.error('Verification failed. Please try again.');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [user]);

  return {
    checkMFAStatus,
    verifyMFACode,
    isVerifying,
  };
}
