import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChevronDown, Wallet, Users, CheckSquare, Settings, Copy, LogOut } from 'lucide-react';
import logo from '@/assets/logo.svg';
import { useDisconnect } from 'wagmi';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, signOut } = useAuth();
  const { isConnected, isWrongNetwork, address, linkedWalletAddress } = useWallet();
  const { disconnect } = useDisconnect();

  const desktopNavLinks = user ? [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/trade', label: 'Trade' },
    { href: '/rewards', label: 'Rewards' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ] : [];

  const moreMenuLinks = [
    { href: '/wallet', label: 'Wallet', icon: Wallet },
    { href: '/referral', label: 'Referral', icon: Users },
    { href: '/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const copyAddress = () => {
    const addr = address || linkedWalletAddress;
    if (addr) {
      navigator.clipboard.writeText(addr);
      toast.success('Address copied!');
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to={user ? '/dashboard' : '/'} className="flex items-center">
            <img src={logo} alt="KieDex" className="h-8" />
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            {desktopNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <>
              {/* Desktop More Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="hidden md:inline-flex">
                  <Button variant="ghost" size="sm" className="gap-1">
                    More <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-popover border-border">
                  {moreMenuLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link to={link.href} className="flex items-center gap-2">
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {isWrongNetwork && (
                <span className="hidden sm:inline text-xs text-destructive">Wrong Network</span>
              )}

              {/* Wallet Section - always show linked wallet address */}
              {linkedWalletAddress ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 font-mono text-xs">
                      <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold">
                        BASE
                      </span>
                      {truncateAddress(address || linkedWalletAddress)}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      {isConnected ? 'Connected to Base' : 'Linked Wallet'}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={copyAddress} className="gap-2 cursor-pointer">
                      <Copy className="h-4 w-4" />
                      Copy Address
                    </DropdownMenuItem>
                    {isConnected && (
                      <DropdownMenuItem 
                        onClick={() => disconnect()} 
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        Disconnect
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <ConnectButton 
                  showBalance={false}
                  chainStatus="icon"
                  accountStatus={{
                    smallScreen: 'avatar',
                    largeScreen: 'address',
                  }}
                />
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="hidden sm:inline-flex"
              >
                Sign Out
              </Button>
            </>
          )}

          {!user && (
            <Link to="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          )}

        </div>
      </div>
    </header>
  );
}
