import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useMFA } from '@/hooks/useMFA';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, User, Mail, Shield, LogOut, Save, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MFASetupDialog } from '@/components/settings/MFASetupDialog';
import { MFADisableDialog } from '@/components/settings/MFADisableDialog';

function SettingsContent() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const queryClient = useQueryClient();
  const {
    mfaStatus,
    isEnabled,
    enroll,
    isEnrolling,
    enrollmentData,
    verify,
    isVerifying,
    disable,
    isDisabling,
  } = useMFA();

  const [username, setUsername] = useState(profile?.username || '');
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [showMFADisable, setShowMFADisable] = useState(false);

  useEffect(() => {
    if (profile?.username) {
      setUsername(profile.username);
    }
  }, [profile?.username]);

  // Auto-show setup dialog when enrollment data is ready
  useEffect(() => {
    if (enrollmentData) {
      setShowMFASetup(true);
    }
  }, [enrollmentData]);

  const handleEnableMFA = () => {
    enroll();
  };

  const handleVerifyMFA = (args: { factorId: string; code: string; backupCodes: string[] }) => {
    verify(args, {
      onSuccess: () => {
        setShowMFASetup(false);
      },
    });
  };

  const handleDisableMFA = (password: string) => {
    disable(password, {
      onSuccess: () => {
        setShowMFADisable(false);
      },
    });
  };

  const updateUsernameMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('user_id', user.id);
      
      if (error) throw error;
      return newUsername;
    },
    onSuccess: () => {
      toast.success('Username updated!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err) => {
      toast.error('Failed to update username');
    },
  });

  const handleSaveUsername = () => {
    if (username.trim()) {
      updateUsernameMutation.mutate(username.trim());
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  return (
    <AppLayout>
      <div className="container py-4 pb-20 md:pb-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account</p>
        </div>

        {/* Profile Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">Username</Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="flex-1"
                />
                <Button 
                  onClick={handleSaveUsername}
                  disabled={updateUsernameMutation.isPending || !username.trim()}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{user?.email || 'Not set'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-secondary/50 border border-border rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm text-foreground font-medium">Two-Factor Authentication</p>
                    {isEnabled ? (
                      <Badge variant="default" className="bg-green-500">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isEnabled 
                      ? 'Your account is protected with two-factor authentication.'
                      : 'Add an extra layer of security to your account by enabling 2FA.'
                    }
                  </p>
                </div>
                <div>
                  {isEnabled ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowMFADisable(true)}
                      disabled={isDisabling}
                    >
                      {isDisabling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Disabling...
                        </>
                      ) : (
                        'Disable'
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleEnableMFA}
                      disabled={isEnrolling}
                    >
                      {isEnrolling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-1" />
                          Enable 2FA
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-foreground font-medium">Account Created</p>
              <p className="text-xs text-muted-foreground mt-1">
                {user?.created_at 
                  ? new Date(user.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Unknown'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm text-foreground">1.0.0</span>
            </div>
            <Separator />
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Network</span>
              <span className="text-sm text-foreground">Base (Mainnet)</span>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* MFA Setup Dialog */}
      {enrollmentData && (
        <MFASetupDialog
          open={showMFASetup}
          onClose={() => setShowMFASetup(false)}
          qrCode={enrollmentData.qrCode}
          secret={enrollmentData.secret}
          factorId={enrollmentData.factorId}
          backupCodes={enrollmentData.backupCodes}
          onVerify={handleVerifyMFA}
          isVerifying={isVerifying}
        />
      )}

      {/* MFA Disable Dialog */}
      <MFADisableDialog
        open={showMFADisable}
        onClose={() => setShowMFADisable(false)}
        onDisable={handleDisableMFA}
        isDisabling={isDisabling}
      />
    </AppLayout>
  );
}

export default function Settings() {
  return (
    <RequireAuth>
      <SettingsContent />
    </RequireAuth>
  );
}
