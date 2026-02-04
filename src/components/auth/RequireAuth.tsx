import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { isAllowedEmailDomain, EMAIL_DOMAIN_ERROR_MESSAGE } from '@/lib/emailValidation';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  // Secondary email domain check as safeguard
  const isBlockedDomain = user?.email && !isAllowedEmailDomain(user.email);

  useEffect(() => {
    if (isBlockedDomain) {
      toast.error(EMAIL_DOMAIN_ERROR_MESSAGE);
      signOut();
    }
  }, [isBlockedDomain, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect blocked domain users to landing page
  if (isBlockedDomain) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
