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
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'games'>('stats');

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
          {(['stats', 'users', 'games'] as const).map((tab) => (
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
      </div>
    </div>
  );
}

