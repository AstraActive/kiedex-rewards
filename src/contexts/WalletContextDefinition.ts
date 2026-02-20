import { createContext } from 'react';

export interface WalletContextType {
  isConnected: boolean;
  address: string | undefined;
  chainId: number | undefined;
  isWrongNetwork: boolean;
  isWalletRequired: boolean;
  switchToBase: () => void;
  walletSaved: boolean;
  linkedWalletAddress: string | null;
  walletMismatch: boolean;
  isLinkingWallet: boolean;
  walletLinkError: string | null;
  disconnectWallet: () => void;
  isLoadingLinkedWallet: boolean;
  resetWalletConnection: () => void;
  isReconnecting: boolean;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);
