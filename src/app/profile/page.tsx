'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import { useAuth } from '@/contexts/AuthContext';
import Toast from '@/components/Toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, updateProfile } = useAuth();
  const account = useCurrentAccount();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    walletAddress: '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    message: '',
    isVisible: false,
    type: 'success' as 'success' | 'error',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        walletAddress: user.walletAddress || '',
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl mb-4">Please login to view your profile</h2>
          <button
            onClick={() => router.push('/login')}
            className="mt-2 px-4 py-2 bg-orange-500 rounded-lg text-white hover:bg-orange-600 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const walletMismatch =
    account?.address &&
    user.walletAddress &&
    account.address.toLowerCase() !== user.walletAddress.toLowerCase();

  const handleUseConnectedWallet = () => {
    if (!account?.address) {
      setToast({
        message: 'Please connect your wallet first',
        isVisible: true,
        type: 'error',
      });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      walletAddress: account.address,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const success = await updateProfile({
        username: formData.username,
        email: formData.email || undefined,
        walletAddress: formData.walletAddress || undefined,
      });
      if (success) {
        setToast({
          message: 'Profile updated successfully',
          isVisible: true,
          type: 'success',
        });
      } else {
        setToast({
          message: 'Failed to update profile. Please try again.',
          isVisible: true,
          type: 'error',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-12 px-4">
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />

      <div className="container mx-auto max-w-2xl">
        <div className="glass border border-orange-500/30 rounded-2xl p-8 md:p-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                Profile Settings
              </h1>
              <p className="text-white/70">
                Update your account details and linked wallet address
              </p>
            </div>
          </div>

          {/* Wallet status */}
          <div className="mb-8 p-6 bg-white/5 rounded-xl border border-orange-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Linked Wallet
                </h3>
                <p className="text-white/60 text-sm">
                  This wallet will be used for all purchases and withdrawals
                </p>
              </div>
              {!account && (
                <ConnectButton
                  connectText="Connect Wallet"
                  className="!bg-gradient-to-r !from-orange-500 !to-orange-600 hover:!from-orange-600 hover:!to-orange-700 !text-white !font-bold !px-4 !py-2 !rounded-lg"
                />
              )}
            </div>

            <div className="space-y-3">
              <p className="text-white/70 text-sm">
                <span className="font-semibold">Saved wallet:</span>{' '}
                <span className="font-mono">
                  {user.walletAddress
                    ? `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-6)}`
                    : 'Not configured'}
                </span>
              </p>
              {account && (
                <p className="text-white/70 text-sm">
                  <span className="font-semibold">Connected wallet:</span>{' '}
                  <span className="font-mono">
                    {account.address.slice(0, 8)}...{account.address.slice(-6)}
                  </span>
                </p>
              )}

              {(!user.walletAddress || walletMismatch) && (
                <p className="text-yellow-400 text-sm">
                  Wallet is not configured or does not match the connected wallet. Please link
                  the correct wallet to enable transactions.
                </p>
              )}

              <button
                type="button"
                onClick={handleUseConnectedWallet}
                disabled={!account}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Use Connected Wallet
              </button>
            </div>
          </div>

          {/* Profile form */}
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-white/80 font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, username: e.target.value }))
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-white/80 font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-white/80 font-medium mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                value={formData.walletAddress}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, walletAddress: e.target.value }))
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono text-sm"
                placeholder="0x..."
              />
              <p className="mt-1 text-white/50 text-xs">
                This must match your connected wallet to use purchase and withdraw.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}






