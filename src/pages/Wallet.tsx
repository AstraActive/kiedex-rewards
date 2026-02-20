import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RequireMFA } from '@/components/auth/RequireMFA';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { useBalances } from '@/hooks/useBalances';
import { useOilDeposits } from '@/hooks/useOilDeposits';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Wallet as WalletIcon, Copy, CheckCircle, Clock, AlertTriangle, ExternalLink, Info, Loader2, History, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';

// Conversion rate: 0.00000001 ETH = 15 Oil
const ETH_TO_OIL_RATE = 1500000000;
const MIN_ETH_DEPOSIT = 0.00000001;

function WalletContent() {
  const { user } = useAuth();
  const { address, isConnected, isReconnecting, isWrongNetwork, switchToBase, linkedWalletAddress } = useWallet();
  const { data: balances, isLoading: balancesLoading } = useBalances();
  const { data: deposits, isLoading: depositsLoading, refetch: refetchDeposits } = useOilDeposits();
  const queryClient = useQueryClient();

  const [ethAmount, setEthAmount] = useState('');
  const [adminWallet, setAdminWallet] = useState<`0x${string}` | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');

  const ethNum = parseFloat(ethAmount) || 0;
  const oilPreview = Math.floor(ethNum * ETH_TO_OIL_RATE);

  // Fetch admin wallet address from backend
  const { data: depositConfig, isLoading: configLoading, isError: configError, error: configErrorDetail } = useQuery({
    queryKey: ['deposit-config'],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('get-deposit-config', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      return response.data as { adminWallet: string; chainId: number; minDeposit: string; conversionRate: number };
    },
    enabled: !!user,
    retry: 1,
  });

  // Set admin wallet when config is loaded
  useEffect(() => {
    if (depositConfig?.adminWallet) {
      setAdminWallet(depositConfig.adminWallet as `0x${string}`);
    }
  }, [depositConfig]);

  // Fetch on-chain ETH balance from Base network
  const { data: onChainBalance, isLoading: onChainLoading, refetch: refetchBalance } = useBalance({
    address: address as `0x${string}`,
    chainId: 8453,
  });

  // Send transaction hook
  const { sendTransaction, data: txHash, isPending: isSending, reset: resetTransaction } = useSendTransaction();

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Verify deposit mutation
  const verifyDepositMutation = useMutation({
    mutationFn: async ({ txHash, walletAddress }: { txHash: string; walletAddress: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('verify-oil-deposit', {
        body: { txHash, walletAddress },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      if (response.data.error) throw new Error(response.data.error);

      return response.data as { success: boolean; ethAmount: number; oilCredited: number; newBalance: number };
    },
    onSuccess: (data) => {
      setVerificationStatus('success');
      toast.success('Oil recharged!', {
        description: `+${data.oilCredited.toLocaleString()} Oil credited`,
      });
      setEthAmount('');
      resetTransaction();
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['oil_deposits'] });
      refetchBalance();
      // Reset status after delay
      setTimeout(() => setVerificationStatus('idle'), 3000);
    },
    onError: (error) => {
      setVerificationStatus('error');
      toast.error('Verification failed', {
        description: error.message,
      });
      resetTransaction();
      // Reset status after delay
      setTimeout(() => setVerificationStatus('idle'), 3000);
    },
  });

  // Watch for transaction confirmation and verify
  useEffect(() => {
    if (isConfirmed && txHash && address && verificationStatus === 'idle' && !verifyDepositMutation.isPending) {
      setVerificationStatus('verifying');
      verifyDepositMutation.mutate({ txHash, walletAddress: address });
    }
  }, [isConfirmed, txHash, address, verificationStatus, verifyDepositMutation]);

  // Handle recharge
  const handleRecharge = async () => {
    if (!address || !adminWallet || ethNum < MIN_ETH_DEPOSIT) return;

    try {
      setVerificationStatus('idle');
      sendTransaction({
        to: adminWallet,
        value: parseEther(ethAmount),
      });
    } catch (error) {
      toast.error('Transaction failed');
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied!');
    }
  };

  const handleRefreshBalance = () => {
    refetchBalance();
    queryClient.invalidateQueries({ queryKey: ['balances'] });
    refetchDeposits();
    toast.success('Balance refreshed!');
  };

  const isProcessing = isSending || isConfirming || verifyDepositMutation.isPending;
  const hasEnoughEth = onChainBalance ? parseFloat(onChainBalance.formatted) >= ethNum : false;

  return (
    <AppLayout>
      <div className="container py-3 md:py-4 pb-20 md:pb-6 space-y-3 md:space-y-4">
        <div>
          <h1 className="text-lg md:text-xl font-semibold md:font-bold text-foreground">Wallet</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Manage your wallet and Oil credits</p>
        </div>

        {/* Connection Status */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <WalletIcon className="h-5 w-5 text-primary" />
              Wallet Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Use linkedWalletAddress (from DB) as source of truth, not isConnected */}
            {!linkedWalletAddress ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>No wallet linked to this account.</AlertDescription>
              </Alert>
            ) : isConnected && isWrongNetwork ? (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Please switch to Base network</AlertDescription>
                </Alert>
                <Button onClick={switchToBase} className="w-full">
                  Switch to Base Network
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  {isReconnecting ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-sm text-foreground">
                    {isConnected ? 'Connected to Base' : isReconnecting ? 'Connecting...' : 'Linked Wallet'}
                  </span>
                </div>
                <span className="font-mono text-sm text-muted-foreground">
                  {(address || linkedWalletAddress)?.slice(0, 6)}...{(address || linkedWalletAddress)?.slice(-4)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* On-Chain Wallet ETH Balance */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-foreground">Wallet ETH Balance</CardTitle>
                <CardDescription>Your real Base ETH wallet balance</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRefreshBalance}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-2 md:py-4">
              <p className="text-2xl md:text-3xl font-semibold md:font-bold text-foreground font-mono">
                {onChainLoading ? (
                  <Skeleton className="h-8 w-28 mx-auto" />
                ) : onChainBalance ? (
                  `${parseFloat(onChainBalance.formatted).toFixed(6)} ETH`
                ) : (
                  '0.000000 ETH'
                )}
              </p>
              {address && (
                <a
                  href={`https://basescan.org/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  View on BaseScan <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Oil Balance */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛢️</span>
              <CardTitle className="text-base text-foreground">Oil Balance</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Oil is an internal fee credit backed by Base ETH deposits.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <CardDescription>Used to pay KieDex trading fees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-2 md:py-4">
              <p className="text-2xl md:text-3xl font-semibold md:font-bold text-foreground font-mono">
                {balancesLoading ? (
                  <Skeleton className="h-8 w-28 mx-auto" />
                ) : (
                  `${(balances?.oil_balance || 0).toLocaleString()} Oil`
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recharge Oil */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              🛢️ Recharge Oil
            </CardTitle>
            <CardDescription>Convert Base ETH to Oil credits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-secondary/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
              <p className="font-mono text-sm text-foreground">0.00000001 ETH = 15 Oil</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground">Amount (ETH)</label>
              <Input
                type="number"
                placeholder="0.00001"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                className="font-mono"
                step="0.00000001"
                min="0"
                disabled={isProcessing}
              />
              <div className="flex gap-2">
                {[0.00001, 0.0001, 0.001].map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => setEthAmount(amt.toString())}
                    disabled={isProcessing}
                  >
                    {amt} ETH
                  </Button>
                ))}
              </div>
            </div>

            {ethNum > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">You will receive</span>
                  <span className="font-mono font-semibold text-primary text-lg">
                    {oilPreview.toLocaleString()} Oil
                  </span>
                </div>
              </div>
            )}

            {ethNum > 0 && !hasEnoughEth && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Insufficient ETH balance</AlertDescription>
              </Alert>
            )}

            {configLoading && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>Loading deposit configuration...</AlertDescription>
              </Alert>
            )}

            {configError && !configLoading && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {(configErrorDetail as Error)?.message?.includes('not configured')
                    ? 'Deposit system is not configured yet. Please contact support.'
                    : 'Failed to load deposit configuration. Please refresh the page.'}
                </AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              disabled={!isConnected || isWrongNetwork || ethNum < MIN_ETH_DEPOSIT || !hasEnoughEth || isProcessing || !adminWallet || configLoading}
              onClick={handleRecharge}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isSending ? 'Confirm in wallet...' : isConfirming ? 'Confirming on chain...' : 'Verifying deposit...'}
                </>
              ) : verificationStatus === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Oil Recharged!
                </>
              ) : (
                'Recharge Oil'
              )}
            </Button>

            {verificationStatus === 'verifying' && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Verifying deposit on Base network...
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Deposit Address Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Deposit ETH</CardTitle>
            <CardDescription>Send Base ETH to your connected wallet first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Only send ETH on Base network. Other networks may result in loss of funds.
              </AlertDescription>
            </Alert>

            {address && (
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Your Wallet Address (Base)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm text-foreground break-all">
                    {address}
                  </code>
                  <Button variant="outline" size="icon" onClick={copyAddress}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deposit History */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <History className="h-5 w-5" />
              Deposit History
            </CardTitle>
            <CardDescription>Your Oil recharge transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {depositsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !deposits || deposits.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No deposits yet</p>
                <p className="text-xs mt-1">Recharge Oil to see your deposit history</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-foreground">
                          +{deposit.oil_credited.toLocaleString()} Oil
                        </span>
                        <Badge
                          variant={deposit.status === 'confirmed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {deposit.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground font-mono">
                          {deposit.eth_amount.toFixed(8)} ETH
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(deposit.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`https://basescan.org/tx/${deposit.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function Wallet() {
  return (
    <RequireAuth>
      <RequireMFA>
        <WalletContent />
      </RequireMFA>
    </RequireAuth>
  );
}
