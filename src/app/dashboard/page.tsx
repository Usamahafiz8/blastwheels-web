'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { useCurrentAccount } from '@mysten/dapp-kit';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const account = useCurrentAccount();
  const [stats, setStats] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [blastwheelzBalance, setBlastwheelzBalance] = useState<string>('0');
  const [blastweelTokenBalance, setBlastweelTokenBalance] = useState<string>('0');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseTxHash, setPurchaseTxHash] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (user && account) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, account]);

  const loadData = async () => {
    try {
      const [statsRes, balanceRes, blastwheelzRes, tokenBalanceRes, leaderboardRes] = await Promise.all([
        apiClient.getStats(),
        apiClient.getBalance(),
        apiClient.getBlastwheelzBalance(),
        apiClient.getBlastweelTokenBalance(),
        apiClient.getLeaderboard(10),
      ]);

      if (statsRes.data) setStats(statsRes.data.stats);
      if (balanceRes.data) setBalance(balanceRes.data);
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
    if (!purchaseAmount || !purchaseTxHash) {
      alert('Please enter amount and transaction hash');
      return;
    }

    setPurchasing(true);
    try {
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
        // Reload balance
        const balanceRes = await apiClient.getBlastwheelzBalance();
        if (balanceRes.data) {
          setBlastwheelzBalance(balanceRes.data.balance);
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
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
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold text-white mb-8 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
          Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Blastwheelz Balance Card */}
          <div className="glass border border-orange-500/30 rounded-xl p-6 hover-3d transition-all duration-300">
            <h3 className="text-white/60 text-sm mb-2">Blastwheelz Balance</h3>
            <p className="text-3xl font-bold text-orange-500">
              {parseFloat(blastwheelzBalance).toFixed(2)}
            </p>
            <p className="text-white/40 text-xs mt-2">In-game currency</p>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="mt-4 w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 text-sm font-semibold"
            >
              Purchase Blastwheelz
            </button>
          </div>

          {/* Blastweel Token Balance Card */}
          <div className="glass border border-blue-500/30 rounded-xl p-6 hover-3d transition-all duration-300">
            <h3 className="text-white/60 text-sm mb-2">Blastweel Tokens</h3>
            <p className="text-3xl font-bold text-blue-500">
              {parseInt(blastweelTokenBalance) > 0 
                ? (parseInt(blastweelTokenBalance) / 1e9).toFixed(2) 
                : '0.00'}
            </p>
            <p className="text-white/40 text-xs mt-2">Available for purchase</p>
            <p className="text-white/30 text-xs mt-1">1 Token = 1 Blastwheelz</p>
          </div>

          {/* WHEELS Balance Card */}
          <div className="glass border border-green-500/30 rounded-xl p-6 hover-3d transition-all duration-300">
            <h3 className="text-white/60 text-sm mb-2">WHEELS Balance</h3>
            <p className="text-3xl font-bold text-green-500">
              {balance ? (parseInt(balance.balance) / 1e9).toFixed(2) : '0.00'}
            </p>
            <p className="text-white/40 text-xs mt-2">Wallet: {account.address.slice(0, 8)}...</p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <>
              <div className="glass border border-orange-500/30 rounded-xl p-6 hover-3d transition-all duration-300">
                <h3 className="text-white/60 text-sm mb-2">Total Games</h3>
                <p className="text-3xl font-bold text-white">{stats.totalGames}</p>
                <p className="text-white/40 text-xs mt-2">
                  {stats.wins} Wins / {stats.losses} Losses
                </p>
              </div>

              <div className="glass border border-orange-500/30 rounded-xl p-6 hover-3d transition-all duration-300">
                <h3 className="text-white/60 text-sm mb-2">Total Earnings</h3>
                <p className="text-3xl font-bold text-green-500">
                  {parseFloat(stats.totalEarnings).toFixed(2)} WHEELS
                </p>
                <p className="text-white/40 text-xs mt-2">Rank: #{stats.rank || 'N/A'}</p>
              </div>

              <div className="glass border border-orange-500/30 rounded-xl p-6 hover-3d transition-all duration-300">
                <h3 className="text-white/60 text-sm mb-2">Level</h3>
                <p className="text-3xl font-bold text-yellow-500">{stats.level}</p>
                <p className="text-white/40 text-xs mt-2">{stats.experience} XP</p>
              </div>
            </>
          )}
        </div>

        {/* Leaderboard */}
        <div className="glass border border-orange-500/30 rounded-xl p-6">
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

        {/* Purchase Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="glass border border-orange-500/30 rounded-xl p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-white mb-4">Purchase Blastwheelz</h2>
              <p className="text-white/60 text-sm mb-6">
                Enter the amount of blastweel tokens you want to convert and the transaction hash from your Sui wallet.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Amount (Blastweel Tokens)
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

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowPurchaseModal(false);
                      setPurchaseAmount('');
                      setPurchaseTxHash('');
                    }}
                    className="flex-1 bg-white/10 border border-white/20 text-white py-2 px-4 rounded-lg hover:bg-white/20 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing || !purchaseAmount || !purchaseTxHash}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {purchasing ? 'Processing...' : 'Purchase'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

