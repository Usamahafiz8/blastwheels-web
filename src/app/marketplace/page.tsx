'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Toast from '@/components/Toast';

interface MarketplaceItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  status: string;
  type: string;
  stock: number | null;
  category: string | null;
  soldCount: number;
  createdAt: string;
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [blastwheelzBalance, setBlastwheelzBalance] = useState<string>('0');
  const [toast, setToast] = useState({ message: '', isVisible: false, type: 'success' as 'success' | 'error' });
  const [filter, setFilter] = useState<{
    status?: 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT';
    type?: string;
    category?: string;
    search?: string;
  }>({ status: 'ACTIVE' });

  useEffect(() => {
    loadItems();
    if (user) {
      loadBalance();
    }
  }, [user, filter]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMarketplaceItems(filter);
      if (response.data) {
        setItems(response.data.items);
      } else {
        setToast({
          message: response.error || 'Failed to load marketplace items',
          isVisible: true,
          type: 'error',
        });
      }
    } catch (error: any) {
      console.error('Failed to load items:', error);
      setToast({
        message: 'Failed to load marketplace items',
        isVisible: true,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await apiClient.getBlastwheelzBalance();
      if (response.data) {
        setBlastwheelzBalance(response.data.balance);
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  const handlePurchaseClick = (item: MarketplaceItem) => {
    if (!user) {
      setToast({
        message: 'Please login to purchase items',
        isVisible: true,
        type: 'error',
      });
      return;
    }

    if (item.status !== 'ACTIVE') {
      setToast({
        message: 'This item is not available for purchase',
        isVisible: true,
        type: 'error',
      });
      return;
    }

    setSelectedItem(item);
    setQuantity(1);
    setShowPurchaseModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedItem || !user) return;

    setPurchasing(true);
    try {
      const response = await apiClient.purchaseMarketplaceItem(selectedItem.id, {
        quantity,
      });

      if (response.error) {
        setToast({
          message: response.error,
          isVisible: true,
          type: 'error',
        });
      } else if (response.data) {
        setToast({
          message: `Successfully purchased ${quantity}x ${selectedItem.name}!`,
          isVisible: true,
          type: 'success',
        });
        setShowPurchaseModal(false);
        setSelectedItem(null);
        // Reload items and balance
        await Promise.all([loadItems(), loadBalance()]);
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      setToast({
        message: error.message || 'Failed to purchase item',
        isVisible: true,
        type: 'error',
      });
    } finally {
      setPurchasing(false);
    }
  };

  const getMaxQuantity = () => {
    if (!selectedItem) return 1;
    if (selectedItem.stock === null) return 999; // Unlimited
    return selectedItem.stock;
  };

  const getTotalPrice = () => {
    if (!selectedItem) return 0;
    return Number(selectedItem.price) * quantity;
  };

  const canPurchase = () => {
    if (!selectedItem || !user) return false;
    const balance = Number(blastwheelzBalance);
    const total = getTotalPrice();
    return balance >= total && quantity > 0 && quantity <= getMaxQuantity();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-500/20 via-orange-600/15 to-orange-500/20 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute top-3/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-600/20 via-orange-500/15 to-orange-600/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-[500px] h-[500px] bg-gradient-to-r from-orange-500/20 via-orange-600/15 to-orange-500/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Marketplace Content */}
      <section className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 sm:mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              🛒 Marketplace
            </h1>
            <p className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto">
              Purchase items with your blastwheelz currency
            </p>
            {user && (
              <div className="mt-4 inline-block px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg">
                <span className="text-white/60 text-sm">Balance: </span>
                <span className="text-orange-400 font-bold text-lg">
                  {Number(blastwheelzBalance).toFixed(2)} blastwheelz
                </span>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4 justify-center">
            <input
              type="text"
              placeholder="Search items..."
              value={filter.search || ''}
              onChange={(e) => setFilter({ ...filter, search: e.target.value || undefined })}
              className="px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500/60"
            />
            <select
              value={filter.type || ''}
              onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
              className="px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg text-white focus:outline-none focus:border-orange-500/60"
            >
              <option value="">All Types</option>
              <option value="NFT">NFT</option>
              <option value="ITEM">Item</option>
              <option value="UPGRADE">Upgrade</option>
              <option value="CURRENCY">Currency</option>
              <option value="OTHER">Other</option>
            </select>
            <select
              value={filter.status || 'ACTIVE'}
              onChange={(e) => setFilter({ ...filter, status: e.target.value as 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT' })}
              className="px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg text-white focus:outline-none focus:border-orange-500/60"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SOLD_OUT">Sold Out</option>
            </select>
          </div>

          {/* Items Grid */}
          <div>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-white/60">Loading marketplace items...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60">No items available at the moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="glass border-2 border-orange-500/30 rounded-lg overflow-hidden hover-3d transition-all duration-300 hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20 group"
                  >
                    <div className="relative aspect-square overflow-hidden bg-black">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl.startsWith('/') ? item.imageUrl : `/${item.imageUrl}`}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-orange-600/20">
                          <span className="text-4xl">🎁</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        {item.status === 'SOLD_OUT' && (
                          <span className="px-2 py-1 bg-red-500/80 text-white text-xs font-bold rounded">
                            SOLD OUT
                          </span>
                        )}
                        {item.status === 'ACTIVE' && item.stock !== null && (
                          <span className="px-2 py-1 bg-green-500/80 text-white text-xs font-bold rounded">
                            {item.stock} left
                          </span>
                        )}
                      </div>
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg sm:text-xl font-extrabold text-white bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent flex-1">
                          {item.name}
                        </h3>
                        {item.category && (
                          <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded ml-2">
                            {item.category}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs sm:text-sm text-white/70 leading-relaxed line-clamp-2 mb-4">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-white/60 text-sm">Price: </span>
                          <span className="text-orange-400 font-bold text-lg">
                            {Number(item.price).toFixed(2)} blastwheelz
                          </span>
                        </div>
                        {item.soldCount > 0 && (
                          <span className="text-white/40 text-xs">
                            {item.soldCount} sold
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handlePurchaseClick(item)}
                        disabled={item.status !== 'ACTIVE' || !user}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md shadow-orange-500/30 text-sm"
                      >
                        {!user
                          ? 'Login to Purchase'
                          : item.status !== 'ACTIVE'
                          ? 'Not Available'
                          : 'Purchase'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="glass border-2 border-orange-500/30 rounded-lg p-6 sm:p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Purchase {selectedItem.name}
            </h2>
            <div className="mb-4">
              <p className="text-white/70 mb-2">{selectedItem.description || 'No description'}</p>
              <div className="flex items-center justify-between p-3 bg-white/5 border border-orange-500/20 rounded-lg mb-4">
                <span className="text-white/60">Price per item:</span>
                <span className="text-orange-400 font-bold">
                  {Number(selectedItem.price).toFixed(2)} blastwheelz
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/80 text-sm font-medium">Quantity:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={getMaxQuantity()}
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setQuantity(Math.max(1, Math.min(val, getMaxQuantity())));
                    }}
                    className="w-20 px-2 py-1 bg-white/5 border border-orange-500/30 rounded text-white text-center focus:outline-none focus:border-orange-500/60"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(getMaxQuantity(), quantity + 1))}
                    disabled={quantity >= getMaxQuantity()}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded"
                  >
                    +
                  </button>
                </div>
              </div>
              {selectedItem.stock !== null && (
                <p className="text-white/50 text-xs text-right">
                  {selectedItem.stock} available
                </p>
              )}
              <div className="flex items-center justify-between p-3 bg-white/5 border border-orange-500/20 rounded-lg mt-4">
                <span className="text-white/60">Total:</span>
                <span className="text-orange-400 font-bold text-xl">
                  {getTotalPrice().toFixed(2)} blastwheelz
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 border border-orange-500/20 rounded-lg mt-2">
                <span className="text-white/60">Your Balance:</span>
                <span className={`font-bold ${Number(blastwheelzBalance) >= getTotalPrice() ? 'text-green-400' : 'text-red-400'}`}>
                  {Number(blastwheelzBalance).toFixed(2)} blastwheelz
                </span>
              </div>
              {Number(blastwheelzBalance) < getTotalPrice() && (
                <p className="text-red-400 text-xs mt-2 text-right">
                  Insufficient balance
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setSelectedItem(null);
                }}
                disabled={purchasing}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing || !canPurchase()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
              >
                {purchasing ? 'Purchasing...' : 'Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
