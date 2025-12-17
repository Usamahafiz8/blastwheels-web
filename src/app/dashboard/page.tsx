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

