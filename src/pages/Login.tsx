import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MFAVerificationDialog } from '@/components/auth/MFAVerificationDialog';
import { useMFAVerification } from '@/hooks/useMFAVerification';

export default function Login() {
  const { user, loading, signInWithGoogle, mfaPending, setMfaPending, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const { checkMFAStatus, verifyMFACode, isVerifying, verificationError } = useMFAVerification();

  // Redirect to dashboard after login, or to the originally requested page
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    const handleMFACheck = async () => {
      if (!loading && user) {
        // Check if MFA is enabled for this user
        const mfaEnabled = await checkMFAStatus(user.id);
        
        if (mfaEnabled && !mfaPending) {
          // MFA is enabled, show verification dialog
          setShowMFADialog(true);
          setMfaPending(true);
        } else if (!mfaEnabled || mfaPending === false) {
          // MFA not enabled or already verified, proceed to dashboard
          navigate(from, { replace: true });
        }
      }
    };

    handleMFACheck();
  }, [user, loading, navigate, from, mfaPending, checkMFAStatus, setMfaPending]);

  const handleMFAVerify = async (code: string, isBackupCode?: boolean) => {
    const result = await verifyMFACode(code, isBackupCode);
    
    if (result.success) {
      setShowMFADialog(false);
      setMfaPending(false);
      // Navigate to dashboard after successful MFA verification
      navigate(from, { replace: true });
    }
  };

  const handleMFACancel = async () => {
    setShowMFADialog(false);
    setMfaPending(false);
    // Sign out if user cancels MFA verification
    await signOut();
    toast({
      title: 'Sign in cancelled',
      description: 'MFA verification is required to continue.',
      variant: 'destructive',
    });
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message || 'Could not sign in with Google. Please try again.',
        variant: 'destructive',
      });
      setIsSigningIn(false);
    }
    // If successful, the OAuth redirect will handle the rest
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout showMobileNav={false}>
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to KieDex</CardTitle>
            <CardDescription>
              Sign in to start trading and earning rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full"
              size="lg"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                By signing in, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MFA Verification Dialog */}
      <MFAVerificationDialog
        open={showMFADialog}
        onVerify={handleMFAVerify}
        onCancel={handleMFACancel}
        isVerifying={isVerifying}
        error={verificationError}
      />
    </AppLayout>
  );
}
