import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { 
  metaMaskWallet, 
  walletConnectWallet,
  coinbaseWallet,
  trustWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Validate projectId
if (!projectId || projectId === 'placeholder-id') {
  console.error(
    '⚠️ Missing WalletConnect Project ID.\n' +
    'Set VITE_WALLETCONNECT_PROJECT_ID in your environment.\n' +
    'Get one at: https://cloud.walletconnect.com'
  );
}

// Dev-only domain allowlist warning
if (import.meta.env.DEV) {
  console.info(
    '🔗 WalletConnect Domain Allowlist:\n' +
    'Make sure these domains are allowlisted in WalletConnect Cloud:\n' +
    '- kiedex.app\n' +
    '- kiedex-demo-rewards.lovable.app\n' +
    '- *.lovableproject.com\n' +
    '- localhost:*\n' +
    'Configure at: https://cloud.walletconnect.com'
  );
}

export const BASE_CHAIN_ID = base.id;

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        coinbaseWallet,
        trustWallet,
      ],
    },
    {
      groupName: 'More',
      wallets: [
        injectedWallet,
      ],
    },
  ],
  {
    appName: 'KieDex',
    appIcon: '/app-icon.svg',
    projectId: projectId || 'placeholder-id',
  }
);

export const config = createConfig({
  connectors,
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  multiInjectedProviderDiscovery: false, // Disable heavy wallet explorer
});
