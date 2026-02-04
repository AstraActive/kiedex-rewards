import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, User, Mail, Shield, LogOut, Save } from 'lucide-react';
import { toast } from 'sonner';

function SettingsContent() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState(profile?.username || '');

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
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-foreground font-medium">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground mt-1">
                We recommend enabling 2FA for additional account security. 
                Contact support for assistance.
              </p>
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
