'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction as SuiTransaction } from '@mysten/sui/transactions';
import { SUI_CONFIG } from '@/lib/sui';
import Toast from '@/components/Toast';

interface NFT {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  suiObjectId: string;
  tokenId: string;
  ownerAddress: string;
  createdAt: string;
  isPurchase?: boolean;
  purchaseId?: string;
  purchaseDate?: string;
  itemType?: string;
  purchasePrice?: string;
  quantity?: number;
}

interface MarketplacePurchase {
  id: string;
  item: {
    id: string;
    name: string;
    imageUrl: string | null;
    price: string;
    type: string;
  };
  quantity: number;
  price: string;
  createdAt: string;
}

interface TransactionRecord {
  id: string;
  type: string;
  amount: string;
  status: string;
  createdAt: string;
  metadata: any;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [stats, setStats] = useState<any>(null);
  const [nativeSuiBalance, setNativeSuiBalance] = useState<string>('0');
  const [wheelsBalance, setWheelsBalance] = useState<string>('0');
  const [blastwheelzBalance, setBlastwheelzBalance] = useState<string>('0');
  const [blastweelTokenBalance, setBlastweelTokenBalance] = useState<string>('0');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseTxHash, setPurchaseTxHash] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [useAutoPurchase, setUseAutoPurchase] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTxHash, setWithdrawTxHash] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  
  // Inventory state
  const [activeMainTab, setActiveMainTab] = useState<'dashboard' | 'inventory'>('dashboard');
  const [activeInventoryTab, setActiveInventoryTab] = useState<'overview' | 'nfts' | 'purchases' | 'transactions'>('overview');
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [purchases, setPurchases] = useState<MarketplacePurchase[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [toast, setToast] = useState({ message: '', isVisible: false, type: 'success' as 'success' | 'error' });

  const walletMismatch =
    !!account?.address &&
    !!user?.walletAddress &&
    account.address.toLowerCase() !== user.walletAddress.toLowerCase();

  useEffect(() => {
    if (user && account) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, account]);

  useEffect(() => {
    if (user && activeMainTab === 'inventory') {
      loadInventoryData();
    }
  }, [user, activeMainTab, activeInventoryTab]);

  const loadData = async () => {
    try {
      // Use the connected wallet address if available, otherwise use the one from user
      const walletAddress = account?.address || user?.walletAddress;
      
      const [statsRes, nativeSuiRes, wheelsRes, blastwheelzRes, tokenBalanceRes, leaderboardRes] = await Promise.all([
        apiClient.getStats(),
        apiClient.getNativeSuiBalance(walletAddress),
        apiClient.getWheelsBalance(walletAddress),
        apiClient.getBlastwheelzBalance(),
        apiClient.getBlastweelTokenBalance(walletAddress),
        apiClient.getLeaderboard(10),
      ]);

      if (statsRes.data) setStats(statsRes.data.stats);
      if (nativeSuiRes.data) {
        setNativeSuiBalance(nativeSuiRes.data.balanceSui);
      } else if (nativeSuiRes.error) {
        console.error('Failed to load native SUI balance:', nativeSuiRes.error);
      }
      if (wheelsRes.data) {
        setWheelsBalance(wheelsRes.data.balanceFormatted);
      } else if (wheelsRes.error) {
        console.error('Failed to load WHEELS balance:', wheelsRes.error);
      }
      if (blastwheelzRes.data) setBlastwheelzBalance(blastwheelzRes.data.balance);
      if (tokenBalanceRes.data) setBlastweelTokenBalance(tokenBalanceRes.data.balance);
      if (leaderboardRes.data) setLeaderboard(leaderboardRes.data.leaderboard);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!purchaseAmount) {
      alert('Please enter amount');
      return;
    }

    if (!account?.address) {
      alert('Please connect your wallet');
      return;
    }

    setPurchasing(true);
    try {
      if (useAutoPurchase) {
        // Auto-purchase flow: Get transaction details, build, sign, and execute
        const txDetails = await apiClient.purchaseBlastwheelzAuto({
          amount: purchaseAmount,
          walletAddress: account.address,
        });

        if (txDetails.error) {
          alert(`Purchase failed: ${txDetails.error}`);
          setPurchasing(false);
          return;
        }

        if (txDetails.data?.treasuryAddress) {
          // Build transaction
          const tx = new SuiTransaction();
          const amountInSmallestUnit = BigInt(txDetails.data.amountInSmallestUnit);

          // Get user's WHEELS coins (purchase token)
          const { suiClient: client } = await import('@/lib/sui');
          const coins = await client.getCoins({
            owner: account.address,
            coinType: txDetails.data.coinType, // WHEELS token
          });

          if (coins.data.length === 0) {
            alert('Insufficient WHEELS token balance');
            setPurchasing(false);
            return;
          }

          // Calculate total balance
          let totalBalance = BigInt(0);
          for (const coin of coins.data) {
            totalBalance += BigInt(coin.balance || '0');
          }

          if (totalBalance < amountInSmallestUnit) {
            alert('Insufficient WHEELS token balance');
            setPurchasing(false);
            return;
          }

          // Build transfer transaction
          // Find the first coin with sufficient balance
          const sufficientCoin = coins.data.find(coin => BigInt(coin.balance || '0') >= amountInSmallestUnit);

          if (!sufficientCoin) {
            alert('No single coin has sufficient balance. Please consolidate your coins first.');
            setPurchasing(false);
            return;
          }

          // Split the payment amount from the selected coin
          const coinObject = tx.object(sufficientCoin.coinObjectId);
          const paymentCoin = tx.splitCoins(coinObject, [amountInSmallestUnit]);

          // Transfer the payment coin to treasury
          tx.transferObjects([paymentCoin], txDetails.data.treasuryAddress);

          // Set gas budget (0.01 SUI)
          tx.setGasBudget(10000000);

          console.log('Transaction built:', tx);
          console.log('Treasury address:', txDetails.data.treasuryAddress);
          console.log('Coin type (WHEELS):', txDetails.data.coinType);
          console.log('Amount:', amountInSmallestUnit.toString());

          // Sign and execute transaction
          signAndExecute({
            transaction: tx,
          },
            {
              onSuccess: async (result) => {
                const txHash = result.digest;
                
                // Verify and credit balance
                const verifyResponse = await apiClient.purchaseBlastwheelzAuto({
                  amount: purchaseAmount,
                  walletAddress: account.address,
                  txHash,
                });

                if (verifyResponse.error) {
                  alert(`Purchase verification failed: ${verifyResponse.error}`);
                } else {
                  alert('Purchase successful!');
                  setShowPurchaseModal(false);
                  setPurchaseAmount('');
                  // Reload balances
                  const [blastwheelzRes, tokenBalanceRes] = await Promise.all([
                    apiClient.getBlastwheelzBalance(),
                    apiClient.getBlastweelTokenBalance(account!.address),
                  ]);
                  if (blastwheelzRes.data) setBlastwheelzBalance(blastwheelzRes.data.balance);
                  if (tokenBalanceRes.data) setBlastweelTokenBalance(tokenBalanceRes.data.balance);
                }
                setPurchasing(false);
              },
              onError: (error) => {
                console.error('Transaction error:', error);
                alert(`Transaction failed: ${error.message || 'Unknown error'}`);
                setPurchasing(false);
              },
            }
          );
        }
      } else {
        // Manual flow: User provides transaction hash
        if (!purchaseTxHash) {
          alert('Please enter transaction hash');
          setPurchasing(false);
          return;
        }

        const response = await apiClient.purchaseBlastwheelz({
          amount: purchaseAmount,
          suiTxHash: purchaseTxHash,
        });

        if (response.error) {
          alert(`Purchase failed: ${response.error}`);
        } else {
          alert('Purchase successful!');
          setShowPurchaseModal(false);
          setPurchaseAmount('');
          setPurchaseTxHash('');
          // Reload balances
          const [blastwheelzRes, tokenBalanceRes] = await Promise.all([
            apiClient.getBlastwheelzBalance(),
            apiClient.getBlastweelTokenBalance(account!.address),
          ]);
          if (blastwheelzRes.data) setBlastwheelzBalance(blastwheelzRes.data.balance);
          if (tokenBalanceRes.data) setBlastweelTokenBalance(tokenBalanceRes.data.balance);
        }
        setPurchasing(false);
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      alert(`Purchase failed: ${error.message || 'Please try again.'}`);
      setPurchasing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) {
      alert('Please enter amount');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const currentBalance = parseFloat(blastwheelzBalance);
    
    if (amount > currentBalance) {
      alert('Insufficient blastwheelz balance');
      return;
    }

    setWithdrawing(true);
    try {
      const response = await apiClient.withdrawBlastwheelz({
        amount: withdrawAmount,
      });

      if (response.error) {
        alert(`Withdrawal failed: ${response.error}`);
      } else {
        alert('Withdrawal successful!');
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setWithdrawTxHash('');
        // Reload balances
        if (account) {
          const [blastwheelzRes, tokenBalanceRes] = await Promise.all([
            apiClient.getBlastwheelzBalance(),
            apiClient.getBlastweelTokenBalance(account.address),
          ]);
          if (blastwheelzRes.data) setBlastwheelzBalance(blastwheelzRes.data.balance);
          if (tokenBalanceRes.data) setBlastweelTokenBalance(tokenBalanceRes.data.balance);
        }
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('Withdrawal failed. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  const loadInventoryData = async () => {
    try {
      setInventoryLoading(true);
      
      // Load NFTs (only if on overview or nfts tab)
      if (activeInventoryTab === 'overview' || activeInventoryTab === 'nfts') {
        const nftsRes = await apiClient.getCars({ 
          ownerAddress: user?.walletAddress,
          limit: 100 
        });
        let allNfts: NFT[] = [];
        
        if (nftsRes.data?.cars) {
          allNfts = nftsRes.data.cars
            .filter((nft: any) => nft.suiObjectId)
            .map((nft: any) => ({
              id: nft.id,
              name: nft.name,
              description: nft.description,
              imageUrl: nft.imageUrl,
              suiObjectId: nft.suiObjectId,
              tokenId: nft.tokenId,
              ownerAddress: nft.ownerAddress,
              createdAt: nft.createdAt,
            }));
        }

        // Also load marketplace purchases
        try {
          const purchasesRes = await apiClient.getUserPurchases(100, 0);
          if (purchasesRes.data?.purchases) {
            const purchasedItems = purchasesRes.data.purchases.map((p: any) => ({
              id: `purchase-${p.id}`,
              name: p.item.name || 'Untitled Item',
              description: null,
              imageUrl: p.item.imageUrl,
              suiObjectId: `purchase-${p.id}`,
              tokenId: `purchase-${p.id}`,
              ownerAddress: user?.walletAddress || '',
              createdAt: p.createdAt,
              isPurchase: true,
              purchaseId: p.id,
              purchaseDate: p.createdAt,
              itemType: p.item.type,
              purchasePrice: p.price,
              quantity: p.quantity,
            }));
            
            allNfts = [...allNfts, ...purchasedItems];
          }
        } catch (error) {
          console.error('Failed to load purchased items:', error);
        }
        
        setNfts(allNfts);
      }

      // Load purchases (only if on overview or purchases tab)
      if (activeInventoryTab === 'overview' || activeInventoryTab === 'purchases') {
        const purchasesRes = await apiClient.getUserPurchases(50, 0);
        if (purchasesRes.data?.purchases) {
          setPurchases(purchasesRes.data.purchases);
        }
      }

      // Load transactions (only if on overview or transactions tab)
      if (activeInventoryTab === 'overview' || activeInventoryTab === 'transactions') {
        const txRes = await apiClient.getTransactions(1, 50);
        if (txRes.data?.transactions) {
          setTransactions(txRes.data.transactions.map((tx: any) => ({
            ...tx,
            amount: tx.amount.toString(),
          })));
        }
      }
    } catch (error: any) {
      console.error('Failed to load inventory data:', error);
      setToast({
        message: 'Failed to load inventory data',
        isVisible: true,
        type: 'error',
      });
    } finally {
      setInventoryLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !account) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl mb-4">Please connect your wallet and login</h2>
          <p className="text-gray-400">You need to be authenticated to access the dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-8 px-4">
      <div className="container mx-auto max-w-[1600px]">
        {/* Main Tabs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              {activeMainTab === 'dashboard' ? 'Dashboard' : 'Inventory Management'}
            </h1>
          </div>
          
          <div className="flex gap-3 border-b border-orange-500/20 pb-4">
            <button
              onClick={() => setActiveMainTab('dashboard')}
              className={`px-6 py-3 font-semibold transition-all duration-300 rounded-t-lg ${
                activeMainTab === 'dashboard'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveMainTab('inventory')}
              className={`px-6 py-3 font-semibold transition-all duration-300 rounded-t-lg ${
                activeMainTab === 'inventory'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              📦 Inventory
            </button>
          </div>
        </div>

        {/* Dashboard Tab Content */}
        {activeMainTab === 'dashboard' && (
          <div>

        {/* Top cards: Account Overview + Your Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* In-game + Wallet Overview */}
          <div className="relative">
            {/* Subtle glow background */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/15 via-purple-500/8 to-blue-500/15 blur-2xl opacity-60 pointer-events-none" />
            <div className="relative glass border border-orange-500/40 rounded-2xl px-4 py-3 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md shadow-orange-500/30">
                    <span className="text-xs font-bold text-white tracking-tight">BW</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-[13px]">Account Overview</h3>
                    <p className="text-white/50 text-[10px]">Wallet & in-game balances</p>
                  </div>
                </div>
                {parseFloat(blastwheelzBalance) > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                    Ready
                  </span>
                )}
              </div>

              <div className="space-y-3.5">
                {/* Blastwheelz main metric */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white/50 text-[10px]">Blastwheelz (In-game)</p>
                    <p className="text-white/40 text-[10px] uppercase tracking-wide">
                      {parseFloat(blastwheelzBalance) > 0 ? 'Ready to race' : 'No balance yet'}
                    </p>
                  </div>
                  <p className="text-2xl md:text-3xl font-extrabold text-orange-400 tracking-tight leading-tight">
                    {parseFloat(blastwheelzBalance).toFixed(2)}
                  </p>
                  <div className="mt-2 h-1 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 via-yellow-400 to-emerald-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (parseFloat(blastwheelzBalance) / 1000) * 100,
                        ).toFixed(0)}%`,
                      }}
                    />
                  </div>
                  {/* Progress bar is purely visual, no extra helper text to save space */}
                </div>

                {/* SUI & WHEELS quick stats */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-white/50 text-[10px] mb-1 flex items-center justify-between">
                      <span>Native SUI (Gas)</span>
                    </p>
                    <p className="text-[12px] font-semibold text-purple-300">
                      {parseFloat(nativeSuiBalance).toFixed(4)}{' '}
                      <span className="text-[10px]">SUI</span>
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-white/50 text-[10px] mb-1 flex items-center justify-between">
                      <span>WHEELS Tokens</span>
                    </p>
                    <p className="text-[12px] font-semibold text-green-300">
                      {parseFloat(wheelsBalance).toFixed(2)}{' '}
                      <span className="text-[10px]">WHEELS</span>
                    </p>
                  </div>
                </div>

                {/* Wallet info */}
                <div className="mt-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-white/50 text-[10px] mb-1">Wallet Address</p>
                  <p className="text-white/80 text-[10px] font-mono break-all leading-snug">
                    {account.address}
                  </p>
                </div>

                {walletMismatch && (
                  <p className="mt-2 text-yellow-300 text-[10px]">
                    Wallet mismatch detected. Please link your connected wallet on the{' '}
                    <span
                      className="underline cursor-pointer hover:text-yellow-100"
                      onClick={() => window.location.assign('/profile')}
                    >
                      Profile
                    </span>{' '}
                    page before purchasing or withdrawing.
                  </p>
                )}
              </div>

              <div className="flex space-x-2.5 mt-3.5">
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  disabled={walletMismatch}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 text-sm font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Purchase Blastwheelz
                </button>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  disabled={parseFloat(blastwheelzBalance) <= 0 || walletMismatch}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          {/* Personal stats summary */}
          <div className="glass border border-orange-500/30 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-white mb-3">Your Performance</h2>
            {stats ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Games</span>
                  <span className="text-white font-semibold">{stats.totalGames}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Wins</span>
                  <span className="text-emerald-400 font-semibold">{stats.wins}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Losses</span>
                  <span className="text-red-400 font-semibold">{stats.losses}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-1">
                  <span className="text-white/60">Total Earnings</span>
                  <span className="text-green-300 font-semibold">
                    {parseFloat(stats.totalEarnings).toFixed(2)} WHEELS
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Rank</span>
                  <span className="text-orange-300 font-semibold">
                    #{stats.rank || 'N/A'}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/10 mt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/60">Level {stats.level}</span>
                    <span className="text-white/60">{stats.experience} XP</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                      style={{
                        width: `${Math.min(100, (stats.experience / 1000) * 100).toFixed(0)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-white/40 text-[10px]">
                    XP bar capped at 1000 XP for display.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-white/60 text-sm">No stats available yet. Play some games!</p>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="glass border border-orange-500/30 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Top Players</h2>
          <div className="space-y-3">
            {leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => (
                <div
                  key={entry.user.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{entry.user.username}</p>
                      <p className="text-white/60 text-sm">
                        {entry.totalGames} games • {entry.wins} wins
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-500 font-bold">
                      {parseFloat(entry.totalEarnings).toFixed(2)} WHEELS
                    </p>
                    <p className="text-white/40 text-sm">Rank #{entry.rank}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white/60 text-center py-8">No leaderboard data available</p>
            )}
          </div>
        </div>
          </div>
        )}

        {/* Inventory Tab Content */}
        {activeMainTab === 'inventory' && (
          <div className="w-full">
            {/* Inventory Sub-tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-orange-500/20 pb-4">
              {(['overview', 'nfts', 'purchases', 'transactions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveInventoryTab(tab)}
                  className={`px-6 py-2.5 font-semibold transition-all duration-300 rounded-lg ${
                    activeInventoryTab === tab
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {inventoryLoading ? (
              <div className="text-center py-12">
                <p className="text-white/60">Loading inventory...</p>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeInventoryTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Balance & Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="glass border border-orange-500/30 rounded-xl p-6">
                        <h3 className="text-white/60 text-sm mb-2">Blastwheelz Balance</h3>
                        <p className="text-3xl font-bold text-orange-400">
                          {Number(blastwheelzBalance).toFixed(2)}
                        </p>
                      </div>
                      {stats && (
                        <>
                          <div className="glass border border-orange-500/30 rounded-xl p-6">
                            <h3 className="text-white/60 text-sm mb-2">Total Games</h3>
                            <p className="text-3xl font-bold text-white">
                              {stats.totalGames || 0}
                            </p>
                            <p className="text-white/40 text-xs mt-1">
                              {stats.wins || 0} wins, {stats.losses || 0} losses
                            </p>
                          </div>
                          <div className="glass border border-orange-500/30 rounded-xl p-6">
                            <h3 className="text-white/60 text-sm mb-2">Total Earnings</h3>
                            <p className="text-3xl font-bold text-green-400">
                              {Number(stats.totalEarnings || 0).toFixed(2)}
                            </p>
                            <p className="text-white/40 text-xs mt-1">
                              Level {stats.level || 1}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="glass border border-orange-500/30 rounded-xl p-6">
                        <h3 className="text-white font-semibold mb-4">Your NFTs</h3>
                        <p className="text-4xl font-bold text-white mb-2">{nfts.length}</p>
                        <p className="text-white/60 text-sm">Total items in collection</p>
                        {nfts.length > 0 && (
                          <button
                            onClick={() => setActiveInventoryTab('nfts')}
                            className="mt-4 text-orange-400 hover:text-orange-300 text-sm font-semibold"
                          >
                            View All →
                          </button>
                        )}
                      </div>
                      <div className="glass border border-orange-500/30 rounded-xl p-6">
                        <h3 className="text-white font-semibold mb-4">Recent Transactions</h3>
                        <p className="text-4xl font-bold text-white mb-2">{transactions.length}</p>
                        <p className="text-white/60 text-sm">Total transactions</p>
                        {transactions.length > 0 && (
                          <button
                            onClick={() => setActiveInventoryTab('transactions')}
                            className="mt-4 text-orange-400 hover:text-orange-300 text-sm font-semibold"
                          >
                            View All →
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Recent NFTs Preview */}
                    {nfts.length > 0 && (
                      <div className="glass border border-orange-500/30 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-white font-semibold text-xl">Recent Items</h3>
                          <button
                            onClick={() => setActiveInventoryTab('nfts')}
                            className="text-orange-400 hover:text-orange-300 text-sm font-semibold"
                          >
                            View All →
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                          {nfts.slice(0, 6).map((nft) => (
                            <div
                              key={nft.id}
                              className="border border-orange-500/20 rounded-lg overflow-hidden hover:border-orange-500/40 transition-colors"
                            >
                              <div className="aspect-square overflow-hidden bg-black">
                                {nft.imageUrl ? (
                                  <img
                                    src={nft.imageUrl.startsWith('/') ? nft.imageUrl : `/${nft.imageUrl}`}
                                    alt={nft.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-orange-600/20">
                                    <span className="text-4xl">🎨</span>
                                  </div>
                                )}
                              </div>
                              <div className="p-3">
                                <p className="text-white font-semibold text-sm truncate">{nft.name}</p>
                                {nft.isPurchase && (
                                  <p className="text-blue-400 text-xs mt-1">Purchased</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* NFTs Tab */}
                {activeInventoryTab === 'nfts' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-white mb-2">Your NFT Collection</h2>
                      <p className="text-white/60">Total: {nfts.length} items</p>
                    </div>
                    {nfts.length === 0 ? (
                      <div className="text-center py-12 glass border border-orange-500/30 rounded-xl">
                        <p className="text-white/60 mb-4">No items in your collection yet</p>
                        <a
                          href="/marketplace"
                          className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all"
                        >
                          Go to Marketplace
                        </a>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                        {nfts.map((nft) => (
                          <div
                            key={nft.id}
                            className="glass border-2 border-orange-500/30 rounded-lg overflow-hidden hover-3d transition-all duration-300 hover:border-orange-500/60"
                          >
                            <div className="relative aspect-square overflow-hidden bg-black">
                              {nft.imageUrl ? (
                                <img
                                  src={nft.imageUrl.startsWith('/') ? nft.imageUrl : `/${nft.imageUrl}`}
                                  alt={nft.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-orange-600/20">
                                  <span className="text-4xl">🎨</span>
                                </div>
                              )}
                              {nft.isPurchase ? (
                                <div className="absolute top-2 right-2 bg-blue-500/90 text-white text-xs px-2 py-1 rounded-full font-bold">
                                  Purchased
                                </div>
                              ) : (
                                <div className="absolute top-2 right-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full font-bold">
                                  Minted
                                </div>
                              )}
                            </div>
                            <div className="p-4 sm:p-5">
                              <h3 className="text-lg font-extrabold text-white mb-2 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                                {nft.name}
                              </h3>
                              {nft.description && (
                                <p className="text-xs sm:text-sm text-white/70 line-clamp-2 mb-3">
                                  {nft.description}
                                </p>
                              )}
                              {nft.isPurchase ? (
                                <div className="space-y-1 text-xs text-white/50">
                                  <p>Purchased: {new Date(nft.purchaseDate || nft.createdAt).toLocaleDateString()}</p>
                                  {nft.itemType && (
                                    <p className="text-orange-400">Type: {nft.itemType}</p>
                                  )}
                                  {nft.purchasePrice && (
                                    <p className="text-green-400">Price: {Number(nft.purchasePrice).toFixed(2)} blastwheelz</p>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1 text-xs text-white/50">
                                  <p className="font-mono">
                                    Token: {nft.tokenId.slice(0, 10)}...
                                  </p>
                                  <p className="font-mono">
                                    Object: {nft.suiObjectId.slice(0, 10)}...
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Purchases Tab */}
                {activeInventoryTab === 'purchases' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-white mb-2">Marketplace Purchases</h2>
                      <p className="text-white/60">Items you've purchased from the marketplace</p>
                    </div>
                    {purchases.length === 0 ? (
                      <div className="text-center py-12 glass border border-orange-500/30 rounded-xl">
                        <p className="text-white/60 mb-4">No purchases yet</p>
                        <a
                          href="/marketplace"
                          className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all"
                        >
                          Browse Marketplace
                        </a>
                      </div>
                    ) : (
                      <div className="glass border border-orange-500/30 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-white/5 border-b border-orange-500/20">
                              <tr>
                                <th className="px-6 py-4 text-left text-white/80 text-sm font-semibold">Item</th>
                                <th className="px-6 py-4 text-left text-white/80 text-sm font-semibold">Type</th>
                                <th className="px-6 py-4 text-left text-white/80 text-sm font-semibold">Quantity</th>
                                <th className="px-6 py-4 text-left text-white/80 text-sm font-semibold">Price</th>
                                <th className="px-6 py-4 text-left text-white/80 text-sm font-semibold">Total</th>
                                <th className="px-6 py-4 text-left text-white/80 text-sm font-semibold">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {purchases.map((purchase) => (
                                <tr key={purchase.id} className="border-b border-white/5 hover:bg-white/5">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      {purchase.item.imageUrl && (
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0">
                                          <img
                                            src={purchase.item.imageUrl.startsWith('/') ? purchase.item.imageUrl : `/${purchase.item.imageUrl}`}
                                            alt={purchase.item.name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      )}
                                      <span className="text-white font-semibold">{purchase.item.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-semibold">
                                      {purchase.item.type}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-white">{purchase.quantity}</td>
                                  <td className="px-6 py-4 text-white">{Number(purchase.price).toFixed(2)} blastwheelz</td>
                                  <td className="px-6 py-4 text-orange-400 font-bold">
                                    {(Number(purchase.price) * purchase.quantity).toFixed(2)} blastwheelz
                                  </td>
                                  <td className="px-6 py-4 text-white/60 text-sm">
                                    {new Date(purchase.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Transactions Tab */}
                {activeInventoryTab === 'transactions' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-white mb-2">Transaction History</h2>
                      <p className="text-white/60">All your currency transactions</p>
                    </div>
                    {transactions.length === 0 ? (
                      <div className="text-center py-12 glass border border-orange-500/30 rounded-xl">
                        <p className="text-white/60">No transactions yet</p>
                      </div>
                    ) : (
                      <div className="glass border border-orange-500/30 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-white/5 border-b border-orange-500/20">
                              <tr>
                                <th className="px-6 py-4 text-left text-white/80 text-sm font-semibold">Type</th>
                                <th className="px-6 py-4 text-left text-white/80 text-sm font-semibold">Amount</th>
                                <th className="px-6 py-4 text-left text-white/80 text-sm font-semibold">Status</th>
                                <th className="px-6 py-4 text-left text-white/80 text-sm font-semibold">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transactions.map((tx) => (
                                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                                  <td className="px-6 py-4 text-white">
                                    <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-semibold">
                                      {tx.type}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-white font-semibold">
                                    {tx.type.includes('WITHDRAWAL') || tx.type.includes('PURCHASE') ? '-' : '+'}
                                    {Number(tx.amount).toFixed(2)} blastwheelz
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-semibold ${
                                        tx.status === 'COMPLETED'
                                          ? 'bg-green-500/20 text-green-400'
                                          : tx.status === 'PENDING'
                                          ? 'bg-yellow-500/20 text-yellow-400'
                                          : 'bg-red-500/20 text-red-400'
                                      }`}
                                    >
                                      {tx.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-white/60 text-sm">
                                    {new Date(tx.createdAt).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Purchase Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="glass border border-orange-500/30 rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-white mb-4">Purchase Blastwheelz</h2>
              
              {/* Toggle between auto and manual */}
              <div className="flex items-center space-x-4 mb-6">
                <button
                  onClick={() => setUseAutoPurchase(true)}
                  className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${
                    useAutoPurchase
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  Auto Transfer
                </button>
                <button
                  onClick={() => setUseAutoPurchase(false)}
                  className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${
                    !useAutoPurchase
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  Manual (Tx Hash)
                </button>
              </div>

              <p className="text-white/60 text-sm mb-6">
                {useAutoPurchase
                  ? 'Transfer WHEELS tokens to treasury wallet automatically. You will be prompted to sign the transaction.'
                  : 'Enter the amount and transaction hash from your Sui wallet.'}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Amount (WHEELS Tokens)
                  </label>
                  <input
                    type="number"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-white/40 text-xs mt-1">
                    You will receive {purchaseAmount || '0'} Blastwheelz (1:1 conversion)
                  </p>
                </div>

                {!useAutoPurchase && (
                  <div>
                    <label className="block text-white/80 text-sm mb-2">
                      Transaction Hash
                    </label>
                    <input
                      type="text"
                      value={purchaseTxHash}
                      onChange={(e) => setPurchaseTxHash(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-orange-500 font-mono text-sm"
                    />
                    <p className="text-white/40 text-xs mt-1">
                      The transaction hash from your Sui wallet
                    </p>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowPurchaseModal(false);
                      setPurchaseAmount('');
                      setPurchaseTxHash('');
                      setUseAutoPurchase(true);
                    }}
                    className="flex-1 bg-white/10 border border-white/20 text-white py-2 px-4 rounded-lg hover:bg-white/20 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing || !purchaseAmount || (!useAutoPurchase && !purchaseTxHash)}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {purchasing ? 'Processing...' : 'Purchase'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="glass border border-blue-500/30 rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-white mb-4">Withdraw Blastwheelz</h2>
              <p className="text-white/60 text-sm mb-6">
                Convert your blastwheelz back to WHEELS tokens in your Sui wallet. Enter the amount you want to withdraw.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Amount (Blastwheelz)
                  </label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={blastwheelzBalance}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-white/40 text-xs mt-1">
                    You will receive {withdrawAmount || '0'} WHEELS Tokens (1:1 conversion)
                  </p>
                  <p className="text-white/30 text-xs mt-1">
                    Available: {parseFloat(blastwheelzBalance).toFixed(2)} Blastwheelz
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      setWithdrawAmount('');
                      setWithdrawTxHash('');
                    }}
                    className="flex-1 bg-white/10 border border-white/20 text-white py-2 px-4 rounded-lg hover:bg-white/20 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) > parseFloat(blastwheelzBalance)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawing ? 'Processing...' : 'Withdraw'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

