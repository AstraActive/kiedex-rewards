import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMFAVerification } from '@/hooks/useMFAVerification';
import { MFAVerificationDialog } from '@/components/auth/MFAVerificationDialog';
import { Loader2 } from 'lucide-react';

interface RequireMFAProps {
  children: React.ReactNode;
}

export function RequireMFA({ children }: RequireMFAProps) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { checkMFAStatus, verifyMFACode, isVerifying } = useMFAVerification();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mfaRequired, setMfaRequired] = useState<boolean | null>(null);
  const [mfaVerified, setMfaVerified] = useState(false);
  const [checkingMFA, setCheckingMFA] = useState(true);

  // Check if MFA is enabled for the user
  useEffect(() => {
    const checkMFA = async () => {
      if (!user?.id) {
        setCheckingMFA(false);
        return;
      }

      // Check if we already verified MFA in this session
      const sessionVerified = sessionStorage.getItem(`mfa_verified_${user.id}`);
      if (sessionVerified === 'true') {
        console.log('[MFA Gate] Already verified in this session');
        setMfaVerified(true);
        setMfaRequired(false);
        setCheckingMFA(false);
        return;
      }

      const isEnabled = await checkMFAStatus(user.id);
      console.log('[MFA Gate] MFA enabled:', isEnabled);
      setMfaRequired(isEnabled);
      setCheckingMFA(false);
    };

    checkMFA();
  }, [user?.id, checkMFAStatus]);

  const handleVerify = async (code: string, isBackupCode?: boolean) => {
    const success = await verifyMFACode(code, isBackupCode);
    
    if (success && user?.id) {
      // Mark as verified in session storage
      sessionStorage.setItem(`mfa_verified_${user.id}`, 'true');
      setMfaVerified(true);
      setMfaRequired(false);
    }
  };

  const handleCancel = async () => {
    // Sign out the user if they cancel MFA verification
    await signOut();
    navigate('/login', { replace: true });
  };

  // Show loading while checking auth or MFA status
  if (authLoading || checkingMFA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no user, don't render anything (RequireAuth will handle redirect)
  if (!user) {
    return null;
  }

  // If MFA is required and not verified, show verification dialog
  if (mfaRequired && !mfaVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <MFAVerificationDialog
          open={true}
          onVerify={handleVerify}
          isVerifying={isVerifying}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  // MFA not required or already verified - render children
  return <>{children}</>;
}
