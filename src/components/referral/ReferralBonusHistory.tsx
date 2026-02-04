import { ReferralBonusHistoryItem } from '@/hooks/useReferralDetails';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { Coins } from 'lucide-react';

interface ReferralBonusHistoryProps {
  history: ReferralBonusHistoryItem[];
  isLoading?: boolean;
}

export function ReferralBonusHistory({ history, isLoading }: ReferralBonusHistoryProps) {
  const isMobile = useIsMobile();

  const formatWallet = (address: string | null) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatKDX = (amount: number) => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No bonus earnings yet</p>
        <p className="text-sm mt-1">You'll earn 8% when your referrals claim KDX rewards</p>
      </div>
    );
  }

  // Mobile card layout
  if (isMobile) {
    return (
      <div className="space-y-2">
        {history.map((item) => (
          <div key={item.id} className="p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-primary font-bold">+{formatKDX(item.referral_bonus_amount)} KDX</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>From: {formatWallet(item.referred_wallet)}</span>
              <span>8% of {formatKDX(item.claimed_amount)} KDX</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop table layout
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Time</th>
            <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Referral</th>
            <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Reward</th>
            <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item) => (
            <tr key={item.id} className="border-b border-border/50">
              <td className="py-2.5 px-2 text-sm text-muted-foreground">
                {format(new Date(item.created_at), 'MMM d, HH:mm')}
              </td>
              <td className="py-2.5 px-2">
                <code className="font-mono text-sm text-foreground">
                  {formatWallet(item.referred_wallet)}
                </code>
              </td>
              <td className="py-2.5 px-2 text-right">
                <span className="text-primary font-medium">
                  +{formatKDX(item.referral_bonus_amount)} KDX
                </span>
              </td>
              <td className="py-2.5 px-2 text-right text-xs text-muted-foreground">
                8% of {formatKDX(item.claimed_amount)} KDX claim
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
