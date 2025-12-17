'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CONFIG } from '@/lib/sui';

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
  const [withdrawTxHash, setWithdrawTxHash] = useState(''); // no longer used, but kept for state reset
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (user && account) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, account]);

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
          const tx = new Transaction();
          const amountInSmallestUnit = BigInt(Math.floor(parseFloat(purchaseAmount) * 1_000_000_000));

          // Get user's WHEELS coins (game token)
          const { suiClient: client } = await import('@/lib/sui');
          const coins = await client.getCoins({
            owner: account.address,
            coinType: SUI_CONFIG.coinType, // WHEELS token
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
            alert('Insufficient balance');
            setPurchasing(false);
            return;
          }

          // Build transfer transaction
          const coinObjects = coins.data.map(coin => tx.object(coin.coinObjectId));
          
          if (coinObjects.length > 1) {
            const mergedCoin = tx.mergeCoins(coinObjects[0], coinObjects.slice(1));
            const paymentCoin = tx.splitCoins(mergedCoin, [amountInSmallestUnit]);
            tx.transferObjects([paymentCoin], txDetails.data.treasuryAddress);
          } else {
            const paymentCoin = tx.splitCoins(coinObjects[0], [amountInSmallestUnit]);
            tx.transferObjects([paymentCoin], txDetails.data.treasuryAddress);
          }

          // Sign and execute transaction
          signAndExecute(
            {
              transaction: tx,
              options: {
                showEffects: true,
                showBalanceChanges: true,
              },
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
                    apiClient.getBlastweelTokenBalance(account.address),
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
            apiClient.getBlastweelTokenBalance(account.address),
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
        const [blastwheelzRes, tokenBalanceRes] = await Promise.all([
          apiClient.getBlastwheelzBalance(),
          apiClient.getBlastweelTokenBalance(account.address),
        ]);
        if (blastwheelzRes.data) setBlastwheelzBalance(blastwheelzRes.data.balance);
        if (tokenBalanceRes.data) setBlastweelTokenBalance(tokenBalanceRes.data.balance);
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('Withdrawal failed. Please try again.');
    } finally {
      setWithdrawing(false);
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Blastwheelz Balance Card */}
          <div className="glass border border-orange-500/30 rounded-xl p-6 hover-3d transition-all duration-300">
            <h3 className="text-white/60 text-sm mb-2">Blastwheelz Balance</h3>
            <p className="text-3xl font-bold text-orange-500">
              {parseFloat(blastwheelzBalance).toFixed(2)}
            </p>
            <p className="text-white/40 text-xs mt-2">In-game currency</p>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 text-sm font-semibold"
              >
                Purchase
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={parseFloat(blastwheelzBalance) <= 0}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Native SUI Balance Card */}
          <div className="glass border border-purple-500/30 rounded-xl p-6 hover-3d transition-all duration-300">
            <h3 className="text-white/60 text-sm mb-2">Native SUI</h3>
            <p className="text-3xl font-bold text-purple-500">
              {parseFloat(nativeSuiBalance).toFixed(4)}
            </p>
            <p className="text-white/40 text-xs mt-2">Gas token</p>
            <p className="text-white/30 text-xs mt-1">Wallet: {account.address.slice(0, 8)}...</p>
          </div>

          {/* WHEELS Token Balance Card */}
          <div className="glass border border-green-500/30 rounded-xl p-6 hover-3d transition-all duration-300">
            <h3 className="text-white/60 text-sm mb-2">WHEELS Tokens</h3>
            <p className="text-3xl font-bold text-green-500">
              {parseFloat(wheelsBalance).toFixed(2)}
            </p>
            <p className="text-white/40 text-xs mt-2">Game token</p>
            <p className="text-white/30 text-xs mt-1">Package: 0x6a9c...c3ee</p>
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
                  ? 'Transfer blastweel tokens to treasury wallet automatically. You will be prompted to sign the transaction.'
                  : 'Enter the amount and transaction hash from your Sui wallet.'}
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
    </div>
  );
}

