'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import { useAuth } from '@/contexts/AuthContext';
import Toast from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const account = useCurrentAccount();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [toast, setToast] = useState({ 
    message: '', 
    isVisible: false, 
    type: 'success' as 'success' | 'error' 
  });
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'wallet' | 'email'>('wallet');

  const handleWalletLogin = async () => {
    if (!account?.address) {
      setToast({
        message: 'Please connect your wallet first',
        isVisible: true,
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const success = await login(account.address);
      if (success) {
        setToast({
          message: 'Login successful! Redirecting...',
          isVisible: true,
          type: 'success',
        });
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setToast({
          message: 'Login failed. Please register first.',
          isVisible: true,
          type: 'error',
        });
      }
    } catch (error: any) {
      setToast({
        message: error.message || 'Login failed. Please try again.',
        isVisible: true,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setToast({
        message: 'Please enter email and password',
        isVisible: true,
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const success = await login(undefined, formData.email, formData.password);
      if (success) {
        setToast({
          message: 'Login successful! Redirecting...',
          isVisible: true,
          type: 'success',
        });
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setToast({
          message: 'Invalid email or password',
          isVisible: true,
          type: 'error',
        });
      }
    } catch (error: any) {
      setToast({
        message: error.message || 'Login failed. Please try again.',
        isVisible: true,
        type: 'error',
      });
    } finally {
      setLoading(false);
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
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-white/70 text-lg">
              Login to continue your racing journey
            </p>
          </div>

          {/* Login Method Tabs */}
          <div className="flex space-x-4 mb-6 border-b border-orange-500/20">
            <button
              onClick={() => setLoginMethod('wallet')}
              className={`flex-1 py-3 font-semibold transition-colors ${
                loginMethod === 'wallet'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Wallet Login
            </button>
            <button
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-3 font-semibold transition-colors ${
                loginMethod === 'email'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Email Login
            </button>
          </div>

          {/* Wallet Login */}
          {loginMethod === 'wallet' && (
            <div className="space-y-6">
              <div className="p-6 bg-white/5 rounded-xl border border-orange-500/20">
                <h3 className="text-white font-semibold text-lg mb-2">
                  Connect Your Sui Wallet
                </h3>
                <p className="text-white/60 text-sm mb-4">
                  Connect your wallet to login instantly
                </p>
                
                {account ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="text-white font-medium">Wallet Connected</p>
                          <p className="text-white/60 text-sm font-mono">
                            {account.address.slice(0, 6)}...{account.address.slice(-4)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleWalletLogin}
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Logging in...' : 'Login with Wallet'}
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <ConnectButton 
                      connectText="Connect Wallet" 
                      className="!bg-gradient-to-r !from-orange-500 !to-orange-600 hover:!from-orange-600 hover:!to-orange-700 !text-white !font-bold !px-6 !py-3 !rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email Login */}
          {loginMethod === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-white/80 font-medium mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-white/80 font-medium mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          {/* Register Link */}
          <div className="text-center pt-6 border-t border-white/10 mt-6">
            <p className="text-white/60">
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-orange-500 hover:text-orange-400 font-semibold transition-colors"
              >
                Register here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

