'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
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
  isPurchase?: boolean; // Flag for marketplace purchases
  purchaseId?: string;
  purchaseDate?: string;
}

interface MarketplacePurchase {
  id: string;
  item: {
    id: string;
    name: string;
    imageUrl: string | null;
    price: string;
  };
  quantity: number;
  price: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  status: string;
  createdAt: string;
  metadata: any;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'nfts' | 'purchases' | 'transactions'>('overview');
  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [purchases, setPurchases] = useState<MarketplacePurchase[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<string>('0');
  const [stats, setStats] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', isVisible: false, type: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (user) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [user, activeTab]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load balance
      const balanceRes = await apiClient.getBlastwheelzBalance();
      if (balanceRes.data) {
        setBalance(balanceRes.data.balance);
      }

      // Load stats
      try {
        const statsRes = await apiClient.getStats();
        if (statsRes.data?.stats) {
          setStats(statsRes.data.stats);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      }

      // Load NFTs (only if on overview or nfts tab)
      if (activeTab === 'overview' || activeTab === 'nfts') {
        // Load NFTs from NFT table
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

        // Also load marketplace purchases (all types, not just NFT)
        // These should appear in inventory as purchased items
        try {
          const purchasesRes = await apiClient.getUserPurchases(100, 0);
          if (purchasesRes.data?.purchases) {
            // Convert purchases to NFT-like format for display
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
            
            // Merge purchased items with NFTs
            allNfts = [...allNfts, ...purchasedItems];
          }
        } catch (error) {
          console.error('Failed to load purchased items:', error);
        }
        
        setNfts(allNfts);
      }

      // Load purchases (only if on overview or purchases tab)
      if (activeTab === 'overview' || activeTab === 'purchases') {
        const purchasesRes = await apiClient.getUserPurchases(50, 0);
        if (purchasesRes.data?.purchases) {
          setPurchases(purchasesRes.data.purchases);
        }
      }

      // Load transactions (only if on overview or transactions tab)
      if (activeTab === 'overview' || activeTab === 'transactions') {
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
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-xl mb-4">Please login to view your inventory</p>
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all"
          >
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-500/20 via-orange-600/15 to-orange-500/20 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute top-3/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-600/20 via-orange-500/15 to-orange-600/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Inventory Content */}
      <section className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 sm:mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              📦 My Inventory
            </h1>
            <p className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto">
              View all your assets, purchases, and transaction history
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center border-b border-orange-500/20 pb-4">
            {(['overview', 'nfts', 'purchases', 'transactions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 font-semibold transition-colors rounded-lg ${
                  activeTab === tab
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-white/60">Loading inventory...</p>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Balance & Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass border border-orange-500/30 rounded-xl p-6">
                      <h3 className="text-white/60 text-sm mb-2">Blastwheelz Balance</h3>
                      <p className="text-3xl font-bold text-orange-400">
                        {Number(balance).toFixed(2)}
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
                      <p className="text-white/60 text-sm">Minted NFTs in collection</p>
                      {nfts.length > 0 && (
                        <button
                          onClick={() => setActiveTab('nfts')}
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
                          onClick={() => setActiveTab('transactions')}
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
                        <h3 className="text-white font-semibold">Recent NFTs</h3>
                        <button
                          onClick={() => setActiveTab('nfts')}
                          className="text-orange-400 hover:text-orange-300 text-sm font-semibold"
                        >
                          View All →
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {nfts.slice(0, 4).map((nft) => (
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
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* NFTs Tab */}
              {activeTab === 'nfts' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Your NFT Collection</h2>
                    <p className="text-white/60">Total: {nfts.length} NFTs</p>
                  </div>
                  {nfts.length === 0 ? (
                    <div className="text-center py-12 glass border border-orange-500/30 rounded-xl">
                      <p className="text-white/60 mb-4">No NFTs in your collection yet</p>
                      <a
                        href="/marketplace"
                        className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all"
                      >
                        Go to Marketplace
                      </a>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
              {activeTab === 'purchases' && (
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
                    <div className="space-y-4">
                      {purchases.map((purchase) => (
                        <div
                          key={purchase.id}
                          className="glass border border-orange-500/30 rounded-xl p-4 flex items-center gap-4"
                        >
                          {purchase.item.imageUrl && (
                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-black flex-shrink-0">
                              <img
                                src={purchase.item.imageUrl.startsWith('/') ? purchase.item.imageUrl : `/${purchase.item.imageUrl}`}
                                alt={purchase.item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="text-white font-semibold">{purchase.item.name}</h3>
                            <p className="text-white/60 text-sm">
                              Quantity: {purchase.quantity} × {Number(purchase.price).toFixed(2)} blastwheelz
                            </p>
                            <p className="text-white/40 text-xs mt-1">
                              {new Date(purchase.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-orange-400 font-bold">
                              {Number(purchase.price) * purchase.quantity} blastwheelz
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Transactions Tab */}
              {activeTab === 'transactions' && (
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
                              <th className="px-4 py-3 text-left text-white/80 text-sm font-semibold">Type</th>
                              <th className="px-4 py-3 text-left text-white/80 text-sm font-semibold">Amount</th>
                              <th className="px-4 py-3 text-left text-white/80 text-sm font-semibold">Status</th>
                              <th className="px-4 py-3 text-left text-white/80 text-sm font-semibold">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactions.map((tx) => (
                              <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="px-4 py-3 text-white">
                                  <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-semibold">
                                    {tx.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-white font-semibold">
                                  {tx.type.includes('WITHDRAWAL') || tx.type.includes('PURCHASE') ? '-' : '+'}
                                  {Number(tx.amount).toFixed(2)} blastwheelz
                                </td>
                                <td className="px-4 py-3">
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
                                <td className="px-4 py-3 text-white/60 text-sm">
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
      </section>

      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

