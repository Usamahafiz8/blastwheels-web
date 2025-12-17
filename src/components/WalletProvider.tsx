'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { registerSlushWallet } from '@mysten/slush-wallet';
import { useEffect, useState } from 'react';

// Create a query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Network configuration using createNetworkConfig (recommended approach)
const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    // Register Slush wallet early in the app lifecycle
    // This only needs to be done once
    if (!isRegistered) {
      try {
        // Register Slush wallet; current dapp-kit types only accept origin/metadata options
        registerSlushWallet('Blast Wheels', {});
        setIsRegistered(true);
      } catch (error) {
        console.error('Failed to register Slush wallet:', error);
      }
    }
  }, [isRegistered]);

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

