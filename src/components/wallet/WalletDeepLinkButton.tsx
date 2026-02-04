import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { WALLET_DEEP_LINKS, openWalletDeepLink } from '@/lib/walletDeepLinks';
import { memo } from 'react';

interface WalletDeepLinkButtonProps {
  walletId: keyof typeof WALLET_DEEP_LINKS;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const WalletDeepLinkButton = memo(function WalletDeepLinkButton({
  walletId,
  variant = 'outline',
  size = 'default',
  showIcon = true,
  className = '',
}: WalletDeepLinkButtonProps) {
  const wallet = WALLET_DEEP_LINKS[walletId];
  
  if (!wallet) return null;

  const handleClick = () => {
    openWalletDeepLink(walletId);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`w-full justify-start gap-3 ${className}`}
    >
      <span className="text-xl">{wallet.icon}</span>
      <span className="flex-1 text-left font-medium">Open in {wallet.name}</span>
      {showIcon && <ExternalLink className="w-4 h-4 text-muted-foreground" />}
    </Button>
  );
});
