import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireMFA } from '@/components/auth/RequireMFA';
import { RequireWallet } from '@/components/auth/RequireWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReferralDetails } from '@/hooks/useReferralDetails';
import { ReferralUsersTable } from '@/components/referral/ReferralUsersTable';
import { ReferralBonusHistory } from '@/components/referral/ReferralBonusHistory';
import { TradesPagination } from '@/components/trading/TradesPagination';
import { Users, Copy, Gift, Link, Clock, CheckCircle, Coins, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

function ReferralContent() {
  // Pagination state
  const [usersPage, setUsersPage] = useState(0);
  const [usersPageSize, setUsersPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  const {
    referralCode,
    referralLink,
    referralUsers,
    usersTotalPages,
    usersLoading,
    bonusHistory,
    historyTotalPages,
    historyLoading,
    totalInvited,
    activeCount,
    pendingCount,
    totalBonusEarned,
  } = useReferralDetails({
    usersPage,
    usersPageSize,
    historyPage,
    historyPageSize,
  });

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied!');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  const formatKDX = (amount: number) => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <AppLayout>
      <div className="container py-4 pb-20 md:pb-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Referral Program</h1>
          <p className="text-sm text-muted-foreground">Invite friends and earn 8% of their claimed KDX rewards</p>
        </div>

        {/* Referral Code - Compact */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Gift className="h-5 w-5 text-primary shrink-0" />
                <code className="font-mono text-lg font-bold text-primary">
                  {referralCode || '...'}
                </code>
                <Button variant="outline" size="sm" onClick={copyCode} className="h-7 px-2">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 p-2 bg-secondary/50 rounded font-mono text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                  {referralLink || '...'}
                </div>
                <Button variant="outline" size="icon" onClick={copyLink} className="h-8 w-8 shrink-0">
                  <Link className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{totalInvited}</p>
              <p className="text-xs text-muted-foreground">Total Invited</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 text-warning mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Coins className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-primary">{formatKDX(totalBonusEarned)}</p>
              <p className="text-xs text-muted-foreground">KDX Earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="referrals">
          <TabsList className="bg-secondary h-9 w-full grid grid-cols-3">
            <TabsTrigger value="referrals" className="text-xs">Your Referrals</TabsTrigger>
            <TabsTrigger value="earnings" className="text-xs">Earnings History</TabsTrigger>
            <TabsTrigger value="howto" className="text-xs">How It Works</TabsTrigger>
          </TabsList>

          {/* Your Referrals Tab */}
          <TabsContent value="referrals" className="mt-3">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Your Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReferralUsersTable users={referralUsers} isLoading={usersLoading} />
                {referralUsers.length > 0 && (
                  <TradesPagination
                    page={usersPage}
                    totalPages={usersTotalPages}
                    pageSize={usersPageSize}
                    onPageChange={setUsersPage}
                    onPageSizeChange={(size) => {
                      setUsersPageSize(size);
                      setUsersPage(0);
                    }}
                    isLoading={usersLoading}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings History Tab */}
          <TabsContent value="earnings" className="mt-3">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Referral Earnings History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReferralBonusHistory history={bonusHistory} isLoading={historyLoading} />
                {bonusHistory.length > 0 && (
                  <TradesPagination
                    page={historyPage}
                    totalPages={historyTotalPages}
                    pageSize={historyPageSize}
                    onPageChange={setHistoryPage}
                    onPageSizeChange={(size) => {
                      setHistoryPageSize(size);
                      setHistoryPage(0);
                    }}
                    isLoading={historyLoading}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* How It Works Tab */}
          <TabsContent value="howto" className="mt-3">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base text-foreground">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">1</div>
                  <div>
                    <p className="text-sm text-foreground font-medium">Share your code</p>
                    <p className="text-xs text-muted-foreground">Send your referral link to friends. When they sign up using your link, they're linked to your account.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">2</div>
                  <div>
                    <p className="text-sm text-foreground font-medium">They connect & trade</p>
                    <p className="text-xs text-muted-foreground">Your referral becomes "Active" when they connect a wallet. Their trading activity generates KDX rewards.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">3</div>
                  <div>
                    <p className="text-sm text-foreground font-medium">Earn 8% bonus</p>
                    <p className="text-xs text-muted-foreground">Every time your referral claims KDX rewards, you automatically receive 8% of their claimed amount as a bonus.</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-foreground font-medium mb-1">💡 Pro Tip</p>
                  <p className="text-xs text-muted-foreground">
                    The more active traders you refer, the more passive income you earn! There's no limit to how many people you can invite.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default function Referral() {
  return (
    <RequireAuth>
      <RequireMFA>
        <RequireWallet pageName="Referral">
          <ReferralContent />
        </RequireWallet>
      </RequireMFA>
    </RequireAuth>
  );
}
