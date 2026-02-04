import { ReferralUser } from '@/hooks/useReferralDetails';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ReferralUsersTableProps {
  users: ReferralUser[];
  isLoading?: boolean;
}

export function ReferralUsersTable({ users, isLoading }: ReferralUsersTableProps) {
  const isMobile = useIsMobile();

  const formatWallet = (address: string | null) => {
    if (!address) return 'Not connected';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatKDX = (amount: number) => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No referrals yet</p>
        <p className="text-sm mt-1">Share your code to invite friends!</p>
      </div>
    );
  }

  // Mobile card layout
  if (isMobile) {
    return (
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <code className="font-mono text-sm text-foreground">
                {formatWallet(user.wallet_address)}
              </code>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded flex items-center gap-1",
                user.status === 'active'
                  ? "bg-primary/20 text-primary"
                  : "bg-warning/20 text-warning"
              )}>
                {user.status === 'active' ? (
                  <><CheckCircle className="h-3 w-3" /> Active</>
                ) : (
                  <><Clock className="h-3 w-3" /> Pending</>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
              </span>
              <span>Vol: {formatVolume(user.total_volume)}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Bonus Earned</span>
              <span className="text-primary font-medium">+{formatKDX(user.total_bonus_from_user)} KDX</span>
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
            <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Wallet</th>
            <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Joined</th>
            <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Status</th>
            <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Volume</th>
            <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Bonus Earned</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border/50">
              <td className="py-2.5 px-2">
                <code className="font-mono text-sm text-foreground">
                  {formatWallet(user.wallet_address)}
                </code>
              </td>
              <td className="py-2.5 px-2 text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
              </td>
              <td className="py-2.5 px-2">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded inline-flex items-center gap-1",
                  user.status === 'active'
                    ? "bg-primary/20 text-primary"
                    : "bg-warning/20 text-warning"
                )}>
                  {user.status === 'active' ? (
                    <><CheckCircle className="h-3 w-3" /> Active</>
                  ) : (
                    <><Clock className="h-3 w-3" /> Pending</>
                  )}
                </span>
              </td>
              <td className="py-2.5 px-2 text-right text-sm text-foreground font-mono">
                {formatVolume(user.total_volume)}
              </td>
              <td className="py-2.5 px-2 text-right text-sm text-primary font-medium">
                +{formatKDX(user.total_bonus_from_user)} KDX
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
