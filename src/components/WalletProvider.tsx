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
  mainnet: { url: getFullnodeUrl('mainnet') },
});

// Get default network from environment variable (client-side needs NEXT_PUBLIC_ prefix)
// NEXT_PUBLIC_ variables are embedded at build time and available everywhere
const getDefaultNetwork = (): 'mainnet' | 'devnet' | 'localnet' => {
  // Check for NEXT_PUBLIC_SUI_NETWORK first (client-side env var)
  const envNetwork = process.env.NEXT_PUBLIC_SUI_NETWORK;
  
  if (envNetwork && ['mainnet', 'devnet', 'localnet'].includes(envNetwork)) {
    console.log(`🌐 Using network from NEXT_PUBLIC_SUI_NETWORK: ${envNetwork}`);
    return envNetwork as 'mainnet' | 'devnet' | 'localnet';
  }
  
  // Default to mainnet if not specified (matching backend configuration)
  console.log('🌐 Using default network: mainnet (set NEXT_PUBLIC_SUI_NETWORK=mainnet in .env.local to be explicit)');
  return 'mainnet';
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

  // Log network configuration for debugging
  useEffect(() => {
    console.log('🔧 Wallet Provider Network Configuration:', {
      defaultNetwork,
      envNetwork: process.env.NEXT_PUBLIC_SUI_NETWORK,
      networkConfig: Object.keys(networkConfig),
    });
  }, [defaultNetwork]);

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

