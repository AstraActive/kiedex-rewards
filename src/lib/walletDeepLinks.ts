// Deep link configurations for popular mobile wallets
// These enable users to open dApps directly in wallet browsers

const getAppUrl = () => {
  if (typeof window === 'undefined') return 'kiedex.app';
  return window.location.host;
};

export interface WalletDeepLinkConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  getUniversalLink: () => string;
  getAndroidLink: () => string;
  getIOSLink: () => string;
  downloadUrl: string;
}

export const WALLET_DEEP_LINKS: Record<string, WalletDeepLinkConfig> = {
  metamask: {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    color: 'hsl(25, 100%, 50%)',
    getUniversalLink: () => `https://metamask.app.link/dapp/${getAppUrl()}`,
    getAndroidLink: () => `https://metamask.app.link/dapp/${getAppUrl()}`,
    getIOSLink: () => `metamask://dapp/${getAppUrl()}`,
    downloadUrl: 'https://metamask.io/download/',
  },
  trustwallet: {
    id: 'trustwallet',
    name: 'Trust Wallet',
    icon: '🛡️',
    color: 'hsl(210, 100%, 50%)',
    getUniversalLink: () => `https://link.trustwallet.com/open_url?coin_id=60&url=https://${getAppUrl()}`,
    getAndroidLink: () => `trust://open_url?url=https://${getAppUrl()}`,
    getIOSLink: () => `trust://open_url?url=https://${getAppUrl()}`,
    downloadUrl: 'https://trustwallet.com/download',
  },
  okx: {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '⭕',
    color: 'hsl(0, 0%, 10%)',
    getUniversalLink: () => `okx://wallet/dapp/details?dappUrl=https://${getAppUrl()}`,
    getAndroidLink: () => `okx://wallet/dapp/details?dappUrl=https://${getAppUrl()}`,
    getIOSLink: () => `okx://wallet/dapp/details?dappUrl=https://${getAppUrl()}`,
    downloadUrl: 'https://www.okx.com/download',
  },
  coinbase: {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    color: 'hsl(220, 100%, 50%)',
    getUniversalLink: () => `https://go.cb-w.com/dapp?cb_url=https://${getAppUrl()}`,
    getAndroidLink: () => `https://go.cb-w.com/dapp?cb_url=https://${getAppUrl()}`,
    getIOSLink: () => `https://go.cb-w.com/dapp?cb_url=https://${getAppUrl()}`,
    downloadUrl: 'https://www.coinbase.com/wallet/downloads',
  },
};

export function openWalletDeepLink(walletId: keyof typeof WALLET_DEEP_LINKS): void {
  const wallet = WALLET_DEEP_LINKS[walletId];
  if (!wallet) {
    console.error('Unknown wallet:', walletId);
    return;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  let link: string;
  if (isIOS) {
    link = wallet.getIOSLink();
  } else if (isAndroid) {
    link = wallet.getAndroidLink();
  } else {
    link = wallet.getUniversalLink();
  }

  console.log(`Opening ${wallet.name} deep link:`, link);
  
  // Use window.location for better compatibility with deep links
  window.location.href = link;
}

export function getWalletDownloadUrl(walletId: keyof typeof WALLET_DEEP_LINKS): string {
  return WALLET_DEEP_LINKS[walletId]?.downloadUrl || 'https://ethereum.org/wallets';
}
