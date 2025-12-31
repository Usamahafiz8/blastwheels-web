'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  walletAddress: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'PLAYER';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (walletAddress?: string, email?: string, password?: string) => Promise<boolean>;
  register: (walletAddress: string, username: string, email?: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: { username?: string; email?: string; walletAddress?: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await apiClient.getMe();
      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    walletAddress?: string,
    email?: string,
    password?: string
  ): Promise<boolean> => {
    try {
      const payload: any = {};
      if (walletAddress) {
        payload.walletAddress = walletAddress;
      } else if (email && password) {
        payload.email = email;
        payload.password = password;
      } else {
        return false;
      }

      const response = await apiClient.login(payload);
      if (response.data?.user) {
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (
    walletAddress: string,
    username: string,
    email?: string,
    password?: string
  ): Promise<boolean> => {
    try {
      const response = await apiClient.register({
        walletAddress: walletAddress || '',
        username,
        email,
        password,
      });
      if (response.data?.user) {
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(error.error || 'Registration failed');
    }
  };

  const logout = () => {
    apiClient.setToken(null); // This already handles both 'auth_token' and 'token'
    setUser(null);
    // Ensure both tokens are cleared (redundant but safe)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.getMe();
      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const updateProfile = async (payload: {
    username?: string;
    email?: string;
    walletAddress?: string;
  }): Promise<boolean> => {
    try {
      const response = await apiClient.updateProfile(payload);
      if (response.data?.user) {
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Update profile failed:', error);
      return false;
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAdmin,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

