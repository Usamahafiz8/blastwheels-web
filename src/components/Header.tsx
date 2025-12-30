'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { ConnectButton } from '@mysten/dapp-kit';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-orange-500/20">
      <nav className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center">
              <img
                src="/BlastWheels_Logo_512.png"
                alt="Blast Wheels"
                width={50}
                height={50}
                className="relative z-10 object-contain transition-transform group-hover:scale-105"
              />
            </div>
          </Link>

          {/* Desktop Navigation - Simplified */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <a
              href="#features"
              className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm"
            >
              Features
            </a>
            <Link
              href="/marketplace"
              className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm"
            >
              Marketplace
            </Link>
            <Link
              href="/collection"
              className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm"
            >
              Collection
            </Link>
            {user && (
              <Link
                href="/inventory"
                className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm"
              >
                Inventory
              </Link>
            )}
            <a
              href="#join"
              className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm"
            >
              Join Race
            </a>
            
            {/* Wallet Connect */}
            <div className="connect-button-wrapper ml-2">
              <ConnectButton connectText="Connect" />
            </div>

            {/* User Menu */}
            {user ? (
              <div className="relative ml-2" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-white/80 hover:text-orange-500 transition-colors font-medium text-sm"
                >
                  <span>{user.username || 'Account'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-black/95 border border-orange-500/30 rounded-lg shadow-lg py-2 z-50">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-white/80 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/inventory"
                      className="block px-4 py-2 text-sm text-white/80 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Inventory
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-white/80 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-white/80 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3 ml-2">
                <Link
                  href="/login"
                  className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <div className="connect-button-wrapper">
              <ConnectButton connectText="Connect" />
            </div>
            <button
              className="text-white focus:outline-none p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation - Simplified */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-orange-500/20">
            <div className="flex flex-col space-y-3">
              <a
                href="#features"
                className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </a>
              <Link
                href="/marketplace"
                className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Marketplace
              </Link>
              <Link
                href="/collection"
                className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Collection
              </Link>
              {user && (
                <Link
                  href="/inventory"
                  className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Inventory
                </Link>
              )}
              <a
                href="#join"
                className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Join Race
              </a>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/inventory"
                    className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Inventory
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm py-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="text-left text-white/80 hover:text-orange-500 transition-colors font-medium text-sm py-2"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

