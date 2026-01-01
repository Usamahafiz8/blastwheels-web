'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount, useWallets, ConnectButton } from '@mysten/dapp-kit';
import { useAuth } from '@/contexts/AuthContext';
import Toast from '@/components/Toast';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const account = useCurrentAccount();
  const wallets = useWallets();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [toast, setToast] = useState({ 
    message: '', 
    isVisible: false, 
    type: 'success' as 'success' | 'error' 
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setToast({
        message: 'Please fix the errors in the form',
        isVisible: true,
        type: 'error',
      });
      return;
    }

    setLoading(true);

    try {
      // Use wallet address if connected, otherwise send placeholder
      // The API will generate a unique placeholder address
      const walletAddress = account?.address || '';
      
      const success = await register(
        walletAddress,
        formData.username,
        formData.email || undefined,
        formData.password || undefined
      );

      if (success) {
        setToast({
          message: 'Registration successful! You received 500 blastwheelz as a welcome bonus! Redirecting...',
          isVisible: true,
          type: 'success',
        });
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setToast({
          message: 'Registration failed. Please try again.',
          isVisible: true,
          type: 'error',
        });
      }
    } catch (error: any) {
      // Extract error message - handle both Error objects and API error responses
      const errorMessage = error?.message || error?.error || 'Registration failed. Please try again.';
      setToast({
        message: errorMessage,
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
              Join Blast Wheels
            </h1>
            <p className="text-white/70 text-lg">
              Create your account to start racing and earning
            </p>
          </div>

          {/* Wallet Connection Section */}
          <div className="mb-8 p-6 bg-white/5 rounded-xl border border-orange-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Connect Sui Wallet (Optional)
                </h3>
                <p className="text-white/60 text-sm">
                  Connect your wallet to enable play-to-earn features
                </p>
              </div>
            </div>
            
            {account ? (
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
                {/* The current dapp-kit Wallet type doesn't expose a disconnect method here, */}
                {/* so we omit the manual disconnect button to satisfy TypeScript. */}
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

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-white/80 font-medium mb-2">
                Username <span className="text-orange-500">*</span>
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="Choose a unique username"
                required
              />
              {errors.username && (
                <p className="mt-1 text-red-400 text-sm">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-white/80 font-medium mb-2">
                Email (Optional)
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="your.email@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-red-400 text-sm">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-white/80 font-medium mb-2">
                Password (Optional)
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="Create a password (optional)"
              />
              {errors.password && (
                <p className="mt-1 text-red-400 text-sm">{errors.password}</p>
              )}
              <p className="mt-1 text-white/50 text-xs">
                If you don't set a password, you'll need to connect your wallet to login
              </p>
            </div>

            {/* Confirm Password */}
            {formData.password && (
              <div>
                <label htmlFor="confirmPassword" className="block text-white/80 font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-red-400 text-sm">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-orange-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Login Link */}
            <div className="text-center pt-4">
              <p className="text-white/60">
                Already have an account?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="text-orange-500 hover:text-orange-400 font-semibold transition-colors"
                >
                  Login here
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

