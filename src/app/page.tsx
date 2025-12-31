'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Toast from '@/components/Toast';
import { NFT_CARS } from '@/lib/nft-cars';
import { SUI_CONFIG } from '@/lib/sui';

// WHEELS token address for charts - exact token type string
const WHEELS_TOKEN_ADDRESS = '0x6a9c2ded791f1eea4c23ac9bc3dbebf3e5b9f828a9837c9dd62d5e5698aac3ee::wheels::WHEELS';
const WHEELS_PACKAGE_ID = '0x6a9c2ded791f1eea4c23ac9bc3dbebf3e5b9f828a9837c9dd62d5e5698aac3ee';

// DexScreener pair address (this is the actual trading pair address, not the token address)
const DEXSCREENER_PAIR_ADDRESS = '0x80fb27ef521bf319a4218953538b251e65934eab55d160149aae77a58ca4e1b6';

// DexScreener URLs - Use the pair address
const DEXSCREENER_URL = `https://dexscreener.com/sui/${DEXSCREENER_PAIR_ADDRESS}?embed=1&theme=dark&trades=0&info=0`;
const DEXSCREENER_LINK = `https://dexscreener.com/sui/${DEXSCREENER_PAIR_ADDRESS}`;

// Deterministic random function based on seed (index)
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Round to fixed precision to avoid hydration mismatches
function roundToFixed(num: number, decimals: number = 5): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export default function Home() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState<{ [key: string]: boolean }>({
    chart: false,
    partnerships: false,
    join: false,
    roadmap: false,
    features: false,
    marketplace: false,
    races: false,
    nfts: false,
  });
  const [toast, setToast] = useState({ message: '', isVisible: false, type: 'success' as 'success' | 'error' });
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Handle hash navigation when pathname changes (e.g., navigating from another page)
  useEffect(() => {
    const handleHashNavigation = () => {
      if (window.location.hash) {
        const hash = window.location.hash.substring(1); // Remove #
        // Wait for page to fully render
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            const headerOffset = 80; // Account for fixed header
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
              top: Math.max(0, offsetPosition),
              behavior: 'smooth'
            });
          }
        }, 500);
      }
    };

    handleHashNavigation();
  }, [pathname]);

  useEffect(() => {

    // Use requestAnimationFrame for better scroll performance
    let rafId: number;
    
    const observer = new IntersectionObserver(
      (entries) => {
        rafId = requestAnimationFrame(() => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible((prev) => {
                // Only update if value actually changed
                if (prev[entry.target.id as keyof typeof prev]) {
                  return prev;
                }
                return {
                  ...prev,
                  [entry.target.id]: true,
                };
              });
            }
          });
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Start loading slightly before visible
      }
    );

    // Delay observer setup slightly to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      Object.values(sectionRefs.current).forEach((ref) => {
        if (ref) observer.observe(ref);
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  const setRef = (id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <>
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden" style={{ willChange: 'scroll-position' }}>
      {/* Enhanced Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Optimized gradient orbs with will-change for better performance */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-500/20 via-orange-600/15 to-orange-500/20 rounded-full blur-3xl animate-pulse-glow scale-pulse" style={{ willChange: 'opacity, transform' }}></div>
        <div className="absolute top-3/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-600/20 via-orange-500/15 to-orange-600/20 rounded-full blur-3xl animate-pulse-glow scale-pulse" style={{ animationDelay: '1s', willChange: 'opacity, transform' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-[500px] h-[500px] bg-gradient-to-r from-orange-500/20 via-orange-600/15 to-orange-500/20 rounded-full blur-3xl animate-pulse-glow scale-pulse" style={{ animationDelay: '2s', willChange: 'opacity, transform' }}></div>
        
        {/* Reduced animated stars for better performance */}
        {Array.from({ length: 40 }).map((_, i) => {
          const seed = i * 0.1;
          return (
            <div
              key={i}
              className="star absolute bg-white rounded-full"
              style={{
                left: `${roundToFixed(seededRandom(seed) * 100, 4)}%`,
                top: `${roundToFixed(seededRandom(seed + 1) * 100, 4)}%`,
                width: `${roundToFixed(seededRandom(seed + 2) * 3 + 1, 5)}px`,
                height: `${roundToFixed(seededRandom(seed + 3) * 3 + 1, 5)}px`,
                animationDelay: `${roundToFixed(seededRandom(seed + 4) * 3, 6)}s`,
                animationDuration: `${roundToFixed(2 + seededRandom(seed + 5) * 3, 6)}s`,
                willChange: 'opacity',
              }}
            />
          );
        })}
        
        {/* Enhanced Racing Lines with glow */}
        <div className="absolute top-0 left-0 w-full h-full">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="race-line absolute w-1 h-full bg-gradient-to-b from-transparent via-orange-500/40 to-transparent"
              style={{
                left: `${15 + i * 20}%`,
                animationDelay: `${i * 1.5}s`,
                boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)',
              }}
            />
          ))}
        </div>

        {/* Reduced floating particles for better performance */}
        {Array.from({ length: 10 }).map((_, i) => {
          const seed = i * 0.2;
          return (
            <div
              key={`particle-${i}`}
              className="particle absolute w-2 h-2 bg-orange-500/30 rounded-full"
              style={{
                left: `${roundToFixed(seededRandom(seed) * 100, 4)}%`,
                top: `${roundToFixed(100 + seededRandom(seed + 1) * 20, 4)}%`,
                animationDelay: `${roundToFixed(seededRandom(seed + 2) * 5, 6)}s`,
                animationDuration: `${roundToFixed(15 + seededRandom(seed + 3) * 10, 6)}s`,
                willChange: 'transform, opacity',
              }}
            />
          );
        })}
      </div>

      {/* Hero Section - Minimal */}
      <section className="relative z-10 py-12 sm:py-16 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto w-full">
          {/* Logo - Smaller */}
          <div className="mb-3 animate-slide-up relative">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-orange-500 blur-xl opacity-10 -z-10"></div>
                <img
                  src="/BlastWheels_Logo_512.png"
                  alt="Blast Wheels"
                width={80}
                height={80}
                className="relative z-10 object-contain mx-auto"
                  style={{ 
                  filter: 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.3))'
                  }}
                />
            </div>
          </div>

          {/* Title - Compact */}
          <div className="mb-2 animate-slide-up relative" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-1 bg-gradient-to-r from-orange-300 via-orange-500 to-orange-600 bg-clip-text text-transparent tracking-tight">
              Blast Wheels
              </h1>
            <p className="text-lg sm:text-xl text-orange-400 font-bold">$WHEELS</p>
          </div>
          
          {/* Tagline - Compact */}
          <div className="mb-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-base sm:text-lg text-white/90 font-semibold">
              Next-Generation <span className="text-orange-400">Play-to-Earn</span> Racing Game on Sui
            </p>
          </div>

          {/* Description - Condensed */}
          <div className="mb-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <p className="text-sm text-white/70 mb-3 max-w-2xl mx-auto leading-relaxed">
              Compete in <span className="text-orange-400 font-semibold">live online races</span>, climb <span className="text-orange-400 font-semibold">leaderboards</span>, and upgrade your garage with <span className="text-orange-400 font-semibold">NFT cars</span>. 
              Seamless wallet integration for deposit, race, earn, and withdraw <span className="text-orange-400 font-semibold">$WHEELS</span>.
            </p>
          </div>
          
          {/* CTA Buttons - Compact */}
          <div className="animate-fade-in flex flex-col sm:flex-row gap-3 justify-center items-center" style={{ animationDelay: '0.4s' }}>
            <Link
              href="/dashboard"
              className="group relative px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/50 text-sm sm:text-base"
            >
              <span className="relative z-10">🚀 Start Racing</span>
            </Link>
            <Link
              href="/marketplace"
              className="group relative px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 border border-orange-500/30 text-sm sm:text-base"
            >
              <span className="relative z-10">NFT Marketplace</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Contract Address Section - Compact & Mobile Responsive */}
      <section className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        <div className="text-center max-w-4xl mx-auto">
          <div 
            className="glass border border-orange-500/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 max-w-2xl mx-auto hover-3d glow-orange-hover transition-all duration-300"
          >
            <p className="text-white/60 text-xs sm:text-sm mb-2 font-semibold">Contract Address:</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <code className="text-white/90 text-[10px] sm:text-xs font-mono bg-white/5 px-2 sm:px-3 py-1.5 rounded border border-white/10 break-all w-full sm:w-auto text-center sm:text-left">
                0x6a9c2ded791f1eea4c23ac9bc3dbebf3e5b9f828a9837c9dd62d5e5698aac3ee::wheels::WHEELS
              </code>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText('0x6a9c2ded791f1eea4c23ac9bc3dbebf3e5b9f828a9837c9dd62d5e5698aac3ee::wheels::WHEELS');
                    setToast({ message: 'Contract address copied!', isVisible: true, type: 'success' });
                  } catch (err) {
                    setToast({ message: 'Failed to copy', isVisible: true, type: 'error' });
                  }
                }}
                className="text-white/60 hover:text-orange-500 transition-all px-3 py-2 rounded hover:bg-orange-500/10 transform hover:scale-110 flex-shrink-0"
                title="Copy contract address"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Compact BUY $WHEELS Buttons Grid */}
          {/* <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-8">
            {Array.from({ length: 24 }).map((_, i) => (
              <button
                key={i}
                className="group relative px-3 py-2 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md shadow-orange-500/30 hover:shadow-orange-500/50 text-xs overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                <span className="relative z-10">BUY $WHEELS</span>
              </button>
            ))}
          </div> */}
        </div>
      </section>

      {/* Game Features Section - Compact & Gamey & Mobile Responsive */}
      <section 
        id="features" 
        ref={setRef('features')}
        className={`relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 border-t border-orange-500/20 transition-opacity duration-300 ${
          isVisible.features ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ scrollMarginTop: '80px' }}
      >
        <div className="text-center max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 sm:mb-3 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
             Game Features
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mb-4 sm:mb-6 max-w-2xl mx-auto px-2">
            Blockchain-powered racing with real rewards
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {/* Live Online Races */}
            <div className="glass border-2 border-orange-500/30 rounded-lg p-2 sm:p-3 md:p-4 hover-3d transition-all duration-300 group hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-2 sm:mb-3 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-xl sm:text-2xl">🏁</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-2 text-center">Live Races</h3>
              <p className="text-[10px] sm:text-xs text-white/70 text-center leading-tight px-1">
                Real-time multiplayer races worldwide
              </p>
            </div>

            {/* NFT Cars */}
            <div className="glass border-2 border-orange-500/30 rounded-lg p-2 sm:p-3 md:p-4 hover-3d transition-all duration-300 group hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-2 sm:mb-3 mx-auto group-hover:scale-110 transition-transform">
                
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-2 text-center">NFT Cars</h3>
              <p className="text-[10px] sm:text-xs text-white/70 text-center leading-tight px-1">
                Own, upgrade & race unique NFT cars
              </p>
            </div>

            {/* Leaderboards */}
            <div className="glass border-2 border-orange-500/30 rounded-lg p-2 sm:p-3 md:p-4 hover-3d transition-all duration-300 group hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-2 sm:mb-3 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-xl sm:text-2xl">🏆</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-2 text-center">Leaderboards</h3>
              <p className="text-[10px] sm:text-xs text-white/70 text-center leading-tight px-1">
                Climb ranks & compete for top spots
              </p>
            </div>

            {/* NFT Marketplace */}
            <div className="glass border-2 border-orange-500/30 rounded-lg p-2 sm:p-3 md:p-4 hover-3d transition-all duration-300 group hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-2 sm:mb-3 mx-auto group-hover:scale-110 transition-transform">
               
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-2 text-center">Marketplace</h3>
              <p className="text-[10px] sm:text-xs text-white/70 text-center leading-tight px-1">
                Buy, sell & trade NFT cars on-chain
              </p>
            </div>

            {/* Key-to-Key Racing */}
            <div className="glass border-2 border-orange-500/30 rounded-lg p-2 sm:p-3 md:p-4 hover-3d transition-all duration-300 group hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-2 sm:mb-3 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-xl sm:text-2xl">⚡</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-2 text-center">NFT vs NFT</h3>
              <p className="text-[10px] sm:text-xs text-white/70 text-center leading-tight px-1">
                Key-to-key races with XP rewards
              </p>
            </div>

            {/* Sui Blockchain */}
            <div className="glass border-2 border-orange-500/30 rounded-lg p-2 sm:p-3 md:p-4 hover-3d transition-all duration-300 group hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-2 sm:mb-3 mx-auto group-hover:scale-110 transition-transform">
                <span className="text-xl sm:text-2xl">⛓️</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-2 text-center">Built on Sui</h3>
              <p className="text-[10px] sm:text-xs text-white/70 text-center leading-tight px-1">
                Fast, low-fee blockchain integration
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Chart Section - Compact & Mobile Responsive */}
      <section 
        id="chart" 
        ref={setRef('chart')}
        className={`relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 border-t border-orange-500/20 transition-all duration-1000 ${
          isVisible.chart ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="text-center max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3 sm:mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            $WHEELS Chart
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mb-4 sm:mb-6 max-w-2xl mx-auto px-2">
            Real-time price chart and trading data
          </p>

          {/* Chart Container */}
          <div className="glass border border-orange-500/20 rounded-lg overflow-hidden hover-3d transition-all duration-300">
            <div className="w-full" style={{ height: '600px' }}>
              {isVisible.chart && (
                <iframe
                  key="dexscreener-chart"
                  src={DEXSCREENER_URL}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  title="DexScreener Chart"
                  allow="clipboard-write"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
            </div>
          </div>

          {/* External Link */}
          <div className="mt-4 flex justify-center">
            <a
              href={DEXSCREENER_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-orange-500/30 hover:border-orange-500/50 text-white rounded-lg transition-all duration-300 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              View on DexScreener
            </a>
          </div>
        </div>
      </section>

      {/* NFT Marketplace Section - Link to Marketplace Page */}
      <section 
        id="marketplace" 
        ref={setRef('marketplace')}
        className={`relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 border-t border-orange-500/20 transition-opacity duration-300 ${
          isVisible.marketplace ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="text-center max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 sm:mb-3 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
             NFT Marketplace
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mb-4 sm:mb-6 max-w-2xl mx-auto px-2">
            Secure on-chain buying, selling & trading
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="glass border-2 border-orange-500/30 rounded-lg p-4 sm:p-5 hover-3d transition-all duration-300 hover:border-orange-500/60">
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Primary Sales</h3>
              <p className="text-xs sm:text-sm text-white/70 mb-2 sm:mb-3">
                Brand new NFT cars with unique stats & upgrade potential
              </p>
              <ul className="text-[10px] sm:text-xs text-white/60 space-y-1 list-disc list-inside">
                <li>Unique designs</li>
                <li>Transparent pricing</li>
                <li>Instant Sui ownership</li>
              </ul>
            </div>
            
            <div className="glass border-2 border-orange-500/30 rounded-lg p-4 sm:p-5 hover-3d transition-all duration-300 hover:border-orange-500/60">
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Secondary Trading</h3>
              <p className="text-xs sm:text-sm text-white/70 mb-2 sm:mb-3">
                Trade with players & build your perfect racing garage
              </p>
              <ul className="text-[10px] sm:text-xs text-white/60 space-y-1 list-disc list-inside">
                <li>User-to-user trades</li>
                <li>Advanced filters</li>
                <li>Detailed car stats</li>
              </ul>
            </div>
          </div>

          <Link
            href="/marketplace"
            className="inline-block px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/50 text-base sm:text-lg"
          >
            Explore Marketplace →
          </Link>
        </div>
      </section>

      {/* NFT Showcase Section */}
      <section 
        id="nfts" 
        ref={setRef('nfts')}
        className={`relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 border-t border-orange-500/20 transition-opacity duration-300 ${
          isVisible.nfts ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="text-center max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 sm:mb-3 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            NFT Collection
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mb-4 sm:mb-6 max-w-2xl mx-auto px-2">
            Limited edition NFT cars ready for the track
          </p>
          
          {/* NFT Cars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {NFT_CARS.map((car, index) => (
              <div
                key={index}
                className="glass border-2 border-orange-500/30 rounded-lg overflow-hidden hover-3d transition-all duration-300 hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20 group"
              >
                <div className="relative aspect-square overflow-hidden bg-black">
                  <img
                    src={`/${car.image}`}
                    alt={car.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                    {car.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed line-clamp-4">
                    {car.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnerships/Sponsors Section - Compact & Mobile Responsive */}
      <section 
        id="partnerships" 
        ref={setRef('partnerships')}
        className={`relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 border-t border-orange-500/20 transition-opacity duration-300 ${
          isVisible.partnerships ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 sm:mb-6 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            🤝 Partnerships
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto px-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="glass border border-orange-500/20 rounded-lg p-3 sm:p-4 h-20 sm:h-24 flex items-center justify-center hover:border-orange-500/50 transition-all duration-300 hover-3d glow-orange-hover group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center group-hover:from-orange-500/40 group-hover:to-orange-600/40 transition-all duration-300">
                  <p className="text-white/40 group-hover:text-orange-500 text-[10px] sm:text-xs font-bold transition-colors">Partner {i}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join The Race Section - Compact & Mobile Responsive */}
      <section 
        id="join" 
        ref={setRef('join')}
        className={`relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 border-t border-orange-500/20 transition-opacity duration-300 ${
          isVisible.join ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="text-center max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 sm:mb-6 md:mb-8 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            Join The Race! 🏁
          </h2>
          
          {/* Steps Grid - Horizontal Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Step 1 */}
            <div className="glass border-2 border-orange-500/30 rounded-lg sm:rounded-xl p-4 sm:p-5 hover-3d transition-all duration-300 group hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform mb-2 sm:mb-3">
                  1
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3">Setup Wallet</h3>
                <div className="text-xs sm:text-sm text-white/80 space-y-1 sm:space-y-2">
                  <p><strong className="text-orange-400">Mobile:</strong> Download Phantom app</p>
                  <p><strong className="text-orange-400">Desktop:</strong> Install Phantom extension</p>
                  <p className="text-[10px] sm:text-xs text-white/60">Fund with Sui from exchange</p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="glass border-2 border-orange-500/30 rounded-lg sm:rounded-xl p-4 sm:p-5 hover-3d transition-all duration-300 group hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform mb-2 sm:mb-3">
                  2
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3">Get $WHEELS</h3>
                <div className="text-xs sm:text-sm text-white/80 space-y-1 sm:space-y-2">
                  <p>Swap Sui for $WHEELS on Blast.fun</p>
                  <button className="mt-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md w-full sm:w-auto">
                    🪖 Buy $WHEELS
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="glass border-2 border-orange-500/30 rounded-lg sm:rounded-xl p-4 sm:p-5 hover-3d transition-all duration-300 group hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform mb-2 sm:mb-3">
                  3
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3">Start Racing</h3>
                <div className="text-xs sm:text-sm text-white/80 space-y-1 sm:space-y-2">
                  <p>Join Telegram & play with bot</p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2 justify-center">
                    <button className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md">
                      Telegram
                    </button>
                    <button className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md">
                      🚀 Launch
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Section - Compact & Mobile Responsive */}
      <section 
        id="roadmap" 
        ref={setRef('roadmap')}
        className={`relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 border-t border-orange-500/20 transition-opacity duration-300 ${
          isVisible.roadmap ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="text-center max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 sm:mb-6 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            Roadmap
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Stage 1 */}
            <div className="glass border-2 border-orange-500/30 rounded-lg p-4 sm:p-5 hover-3d transition-all duration-300 group hover:border-orange-500/60">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform flex-shrink-0">
                  1
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">Stage 1</h3>
              </div>
              <h4 className="text-xs sm:text-sm font-semibold text-orange-500 mb-2">Early Development</h4>
              <p className="text-[10px] sm:text-xs text-white/70 mb-2 sm:mb-3"><strong className="text-white">Goal:</strong> Build foundation & community</p>
              <ul className="space-y-1 text-[10px] sm:text-xs text-white/70 list-disc list-inside">
                <li>Launch on Blast.fun</li>
                <li>Website deployment</li>
                <li>Core development</li>
              </ul>
            </div>

            {/* Stage 2 */}
            <div className="glass border-2 border-orange-500/30 rounded-lg p-4 sm:p-5 hover-3d transition-all duration-300 group hover:border-orange-500/60">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform flex-shrink-0">
                  2
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">Stage 2</h3>
              </div>
              <h4 className="text-xs sm:text-sm font-semibold text-orange-500 mb-2">Community Building</h4>
              <p className="text-[10px] sm:text-xs text-white/70 mb-2 sm:mb-3"><strong className="text-white">Goal:</strong> Grow adoption</p>
              <ul className="space-y-1 text-[10px] sm:text-xs text-white/70 list-disc list-inside">
                <li>Marketing & DEX fees</li>
                <li>Influencer onboarding</li>
                <li>Community tournaments</li>
              </ul>
            </div>

            {/* Stage 3 */}
            <div className="glass border-2 border-orange-500/30 rounded-lg p-4 sm:p-5 hover-3d transition-all duration-300 group hover:border-orange-500/60">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform flex-shrink-0">
                  3
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">Stage 3</h3>
              </div>
              <h4 className="text-xs sm:text-sm font-semibold text-orange-500 mb-2">Full Release</h4>
              <p className="text-[10px] sm:text-xs text-white/70 mb-2 sm:mb-3"><strong className="text-white">Goal:</strong> Scale globally</p>
              <ul className="space-y-1 text-[10px] sm:text-xs text-white/70 list-disc list-inside">
                <li>PC & Mobile launch</li>
                <li>Global marketing</li>
                <li>Exchange listings</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
