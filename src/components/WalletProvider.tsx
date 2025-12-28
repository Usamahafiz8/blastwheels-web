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

// Get default network from environment variable (client-side needs NEXT_PUBLIC_ prefix)
// NEXT_PUBLIC_ variables are embedded at build time and available everywhere
const getDefaultNetwork = (): 'mainnet' | 'testnet' | 'devnet' | 'localnet' => {
  const envNetwork = process.env.NEXT_PUBLIC_SUI_NETWORK || process.env.SUI_NETWORK;
  if (envNetwork && ['mainnet', 'testnet', 'devnet', 'localnet'].includes(envNetwork)) {
    return envNetwork as 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  }
  // Default to testnet if not specified
  return 'testnet';
};

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

  const defaultNetwork = getDefaultNetwork();

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={defaultNetwork}>
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

