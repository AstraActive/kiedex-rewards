import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useMFAVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | undefined>();

  const checkMFAStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_mfa')
        .select('is_enabled')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking MFA status:', error);
        return false;
      }

      return data?.is_enabled || false;
    } catch (err) {
      console.error('Error checking MFA status:', err);
      return false;
    }
  };

  const verifyMFACode = async (
    code: string, 
    isBackupCode: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    setIsVerifying(true);
    setVerificationError(undefined);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      if (isBackupCode) {
        // Verify backup code
        const { data: mfaData, error: mfaError } = await supabase
          .from('user_mfa')
          .select('backup_codes')
          .eq('user_id', user.id)
          .single();

        if (mfaError || !mfaData?.backup_codes) {
          throw new Error('No backup codes found');
        }

        // Check if the provided code matches any backup code
        const hashedCode = btoa(code + user.id);
        const isValid = mfaData.backup_codes.some((stored: string) => stored === hashedCode);

        if (!isValid) {
          throw new Error('Invalid backup code');
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
      } else {
        // Verify TOTP code
        const { data: factors } = await supabase.auth.mfa.listFactors();
        
        if (!factors?.totp || factors.totp.length === 0) {
          throw new Error('No MFA factors found');
        }

        const factor = factors.totp[0];
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: factor.id,
        });

        if (challengeError) throw challengeError;

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: factor.id,
          challengeId: challengeData.id,
          code,
        });

        if (verifyError) throw new Error('Invalid verification code');

        // Update last_used_at
        await supabase
          .from('user_mfa')
          .update({ last_used_at: new Date().toISOString() })
          .eq('user_id', user.id);

        toast.success('MFA verified successfully');
      }

      setIsVerifying(false);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      setVerificationError(errorMessage);
      setIsVerifying(false);
      return { success: false, error: errorMessage };
    }
  };

  return {
    checkMFAStatus,
    verifyMFACode,
    isVerifying,
    verificationError,
  };
}
