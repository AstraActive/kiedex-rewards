import { useContext } from 'react';
import { WalletContext, WalletContextType } from '@/contexts/WalletContextDefinition';

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
