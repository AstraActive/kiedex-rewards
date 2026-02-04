import { useMemo } from 'react';

interface MobileWalletInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMetaMaskBrowser: boolean;
  isTrustWalletBrowser: boolean;
  isOKXBrowser: boolean;
  isCoinbaseBrowser: boolean;
  isWeb3Browser: boolean;
  isNormalMobileBrowser: boolean;
  browserName: string;
}

export function useMobileWallet(): MobileWalletInfo {
  return useMemo(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    
    // Detect in-app wallet browsers
    const isMetaMaskBrowser = /MetaMaskMobile/i.test(ua) || /MetaMask/i.test(ua) && isMobile;
    const isTrustWalletBrowser = /Trust/i.test(ua) && isMobile;
    const isOKXBrowser = /OKApp/i.test(ua) || /OKEx/i.test(ua);
    const isCoinbaseBrowser = /CoinbaseWallet/i.test(ua) || /CBW/i.test(ua);
    
    const isWeb3Browser = isMetaMaskBrowser || isTrustWalletBrowser || isOKXBrowser || isCoinbaseBrowser;
    const isNormalMobileBrowser = isMobile && !isWeb3Browser;
    
    // Detect browser name
    let browserName = 'Unknown';
    if (isMetaMaskBrowser) browserName = 'MetaMask';
    else if (isTrustWalletBrowser) browserName = 'Trust Wallet';
    else if (isOKXBrowser) browserName = 'OKX';
    else if (isCoinbaseBrowser) browserName = 'Coinbase';
    else if (/CriOS/i.test(ua)) browserName = 'Chrome iOS';
    else if (/Chrome/i.test(ua)) browserName = 'Chrome';
    else if (/Safari/i.test(ua)) browserName = 'Safari';
    else if (/Firefox/i.test(ua)) browserName = 'Firefox';
    
    return {
      isMobile,
      isIOS,
      isAndroid,
      isMetaMaskBrowser,
      isTrustWalletBrowser,
      isOKXBrowser,
      isCoinbaseBrowser,
      isWeb3Browser,
      isNormalMobileBrowser,
      browserName,
    };
  }, []);
}
