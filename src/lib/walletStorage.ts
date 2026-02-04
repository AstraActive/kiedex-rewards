// Keys used by WalletConnect and wagmi
const STORAGE_KEYS = [
  'wagmi.store',
  'wagmi.cache',
  'wagmi.connected',
  'wagmi.wallet',
  'wagmi.recentConnectorId',
  'wc@2:client:0.3',
  'wc@2:core:0.3',
  'wc@2:universal_provider',
  '-walletlink:https://www.walletlink.org:version',
  'walletconnect',
];

// Keys to clear only when fully resetting (not on timeout)
const PERSISTENT_KEYS = ['wagmi.store', 'wagmi.recentConnectorId'];

export function clearWalletStorage(fullReset = false): void {
  // Clear localStorage
  STORAGE_KEYS.forEach(key => {
    // Skip persistent keys unless doing a full reset
    if (!fullReset && PERSISTENT_KEYS.includes(key)) {
      return;
    }
    
    try {
      // Match exact keys and prefix patterns
      Object.keys(localStorage).forEach(k => {
        if (k === key || k.startsWith(key) || k.startsWith('wc@')) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      console.warn('Failed to clear localStorage key:', key);
    }
  });

  // Clear sessionStorage
  try {
    Object.keys(sessionStorage).forEach(k => {
      if (k.startsWith('wc@') || k.startsWith('wagmi')) {
        sessionStorage.removeItem(k);
      }
    });
  } catch (e) {
    console.warn('Failed to clear sessionStorage');
  }
}

export function clearKiedexWalletSession(userId?: string): void {
  if (userId) {
    try {
      sessionStorage.removeItem(`kiedex_wallet_linked_${userId}`);
    } catch (e) {
      // Ignore errors
    }
  }
}
