'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-orange-500/20">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative h-16 w-16 flex items-center justify-center">
              <div className="absolute inset-0 bg-orange-500 blur-xl opacity-50 group-hover:opacity-75 transition-opacity -z-10"></div>
              <img
                src="/BlastWheels_Logo_512.png"
                alt="Blast Wheels"
                width={60}
                height={60}
                className="relative z-10 object-contain transition-transform group-hover:scale-105"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <a
              href="#chart"
              className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Chart
            </a>
            <a
              href="#partnerships"
              className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Partnerships/Sponsors
            </a>
            <a
              href="#join"
              className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Join The Race!
            </a>
            <a
              href="#roadmap"
              className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Roadmap
            </a>
            <div className="connect-button-wrapper">
              <ConnectButton connectText="Connect Wallet" />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-3">
            <button
              className="text-white focus:outline-none"
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

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-orange-500/20">
            <div className="flex flex-col space-y-4">
              <a
                href="#chart"
                className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm uppercase tracking-wide py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Chart
              </a>
              <a
                href="#partnerships"
                className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm uppercase tracking-wide py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Partnerships/Sponsors
              </a>
              <a
                href="#join"
                className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm uppercase tracking-wide py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Join The Race!
              </a>
              <a
                href="#roadmap"
                className="text-white/80 hover:text-orange-500 transition-colors font-medium text-sm uppercase tracking-wide py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Roadmap
              </a>
              <div 
                className="mt-4 connect-button-wrapper connect-button-mobile"
                onClick={() => setIsMenuOpen(false)}
              >
                <ConnectButton connectText="Connect Wallet" />
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

