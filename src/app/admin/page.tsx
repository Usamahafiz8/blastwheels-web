'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'games' | 'marketplace'>('stats');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/');
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'stats') {
        const res = await apiClient.getPlatformStats();
        if (res.data) setPlatformStats(res.data.stats);
      } else if (activeTab === 'users') {
        const res = await apiClient.getAdminUsers();
        if (res.data) setUsers(res.data.users);
      } else if (activeTab === 'games') {
        const res = await apiClient.getAllGames();
        if (res.data) setGames(res.data.games);
      } else if (activeTab === 'marketplace') {
        const res = await apiClient.getAdminMarketplaceItems();
        if (res.data) setMarketplaceItems(res.data.items);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold text-white mb-8 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-orange-500/20">
          {(['stats', 'users', 'games', 'marketplace'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && platformStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass border border-orange-500/30 rounded-xl p-6">
              <h3 className="text-white/60 text-sm mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-white">{platformStats.totalUsers}</p>
              <p className="text-white/40 text-xs mt-2">{platformStats.activeUsers} active</p>
            </div>
            <div className="glass border border-orange-500/30 rounded-xl p-6">
              <h3 className="text-white/60 text-sm mb-2">Total Games</h3>
              <p className="text-3xl font-bold text-white">{platformStats.totalGames}</p>
              <p className="text-white/40 text-xs mt-2">{platformStats.completedGames} completed</p>
            </div>
            <div className="glass border border-orange-500/30 rounded-xl p-6">
              <h3 className="text-white/60 text-sm mb-2">Total Volume</h3>
              <p className="text-3xl font-bold text-green-500">
                {parseFloat(platformStats.totalVolume).toFixed(2)} WHEELS
              </p>
              <p className="text-white/40 text-xs mt-2">{platformStats.totalTransactions} transactions</p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="glass border border-orange-500/30 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-3 text-white/60 font-semibold">Username</th>
                    <th className="pb-3 text-white/60 font-semibold">Wallet</th>
                    <th className="pb-3 text-white/60 font-semibold">Role</th>
                    <th className="pb-3 text-white/60 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/5">
                      <td className="py-3 text-white">{user.username}</td>
                      <td className="py-3 text-white/60 text-sm font-mono">
                        {user.walletAddress.slice(0, 10)}...
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.role === 'ADMIN'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div className="glass border border-orange-500/30 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Game Sessions</h2>
            <div className="space-y-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{game.user.username}</p>
                      <p className="text-white/60 text-sm">
                        Entry: {parseFloat(game.entryFee).toFixed(2)} WHEELS • Status: {game.status}
                      </p>
                    </div>
                    {game.position && (
                      <div className="text-right">
                        <p className="text-orange-500 font-bold">Position: #{game.position}</p>
                        <p className="text-green-500 text-sm">
                          +{parseFloat(game.earnings).toFixed(2)} WHEELS
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <div className="glass border border-orange-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Marketplace Items</h2>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setShowItemModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all"
              >
                + Add Item
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketplaceItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-white/5 rounded-lg border border-orange-500/20 hover:border-orange-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-semibold flex-1">{item.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.status === 'ACTIVE'
                          ? 'bg-green-500/20 text-green-400'
                          : item.status === 'SOLD_OUT'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-white/60 text-sm mb-2 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-orange-400 font-bold">
                      {Number(item.price).toFixed(2)} blastwheelz
                    </span>
                    {item.stock !== null && (
                      <span className="text-white/60 text-xs">Stock: {item.stock}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setShowItemModal(true);
                      }}
                      className="flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this item?')) {
                          const res = await apiClient.deleteMarketplaceItem(item.id);
                          if (res.error) {
                            alert(res.error);
                          } else {
                            loadData();
                          }
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                  {item._count?.purchases > 0 && (
                    <p className="text-white/40 text-xs mt-2">
                      {item._count.purchases} purchase{item._count.purchases !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <ItemModal
          item={editingItem}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
          onSave={() => {
            setShowItemModal(false);
            setEditingItem(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function ItemModal({
  item,
  onClose,
  onSave,
}: {
  item?: any;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    imageUrl: item?.imageUrl || '',
    price: item?.price?.toString() || '',
    status: item?.status || 'ACTIVE',
    type: item?.type || 'ITEM',
    stock: item?.stock?.toString() || '',
    category: item?.category || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        stock: formData.stock ? parseInt(formData.stock) : undefined,
      };
      const res = item
        ? await apiClient.updateMarketplaceItem(item.id, payload)
        : await apiClient.createMarketplaceItem(payload);
      if (res.error) {
        alert(res.error);
      } else {
        onSave();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass border-2 border-orange-500/30 rounded-lg p-6 sm:p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
          {item ? 'Edit Item' : 'Create Item'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-1">Image URL *</label>
            <input
              type="text"
              required
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg text-white focus:outline-none focus:border-orange-500/60"
              placeholder="e.g., /image1.jpeg or https://example.com/image.jpg"
            />
          </div>
          <div>
            <label className="block text-white/80 text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg text-white focus:outline-none focus:border-orange-500/60"
              placeholder="Optional - defaults to 'Untitled Item'"
            />
          </div>
          <div>
            <label className="block text-white/80 text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg text-white focus:outline-none focus:border-orange-500/60"
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-1">Price (blastwheelz)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg text-white focus:outline-none focus:border-orange-500/60"
                placeholder="Optional - defaults to 0"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-1">Stock (leave empty for unlimited)</label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg text-white focus:outline-none focus:border-orange-500/60"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg text-white focus:outline-none focus:border-orange-500/60"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SOLD_OUT">Sold Out</option>
              </select>
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg text-white focus:outline-none focus:border-orange-500/60"
              >
                <option value="NFT">NFT</option>
                <option value="ITEM">Item</option>
                <option value="UPGRADE">Upgrade</option>
                <option value="CURRENCY">Currency</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-white/80 text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-orange-500/30 rounded-lg text-white focus:outline-none focus:border-orange-500/60"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
            >
              {saving ? 'Saving...' : item ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

