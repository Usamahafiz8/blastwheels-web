'use client';

import { useEffect, useRef, useState } from 'react';
import Toast from '@/components/Toast';

// Deterministic random function based on seed (index)
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function Home() {
  const [isVisible, setIsVisible] = useState<{ [key: string]: boolean }>({
    chart: false,
    partnerships: false,
    join: false,
    roadmap: false,
  });
  const [toast, setToast] = useState({ message: '', isVisible: false, type: 'success' as 'success' | 'error' });
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({
              ...prev,
              [entry.target.id]: true,
            }));
          }
        });
      },
      { threshold: 0.1 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
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
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Larger, more vibrant gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-500/20 via-orange-600/15 to-orange-500/20 rounded-full blur-3xl animate-pulse-glow scale-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-600/20 via-orange-500/15 to-orange-600/20 rounded-full blur-3xl animate-pulse-glow scale-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-[500px] h-[500px] bg-gradient-to-r from-orange-500/20 via-orange-600/15 to-orange-500/20 rounded-full blur-3xl animate-pulse-glow scale-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-gradient-to-r from-orange-400/15 via-orange-500/10 to-orange-400/15 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }}></div>
        
        {/* More animated stars with varying sizes */}
        {Array.from({ length: 80 }).map((_, i) => {
          const seed = i * 0.1;
          return (
            <div
              key={i}
              className="star absolute bg-white rounded-full"
              style={{
                left: `${seededRandom(seed) * 100}%`,
                top: `${seededRandom(seed + 1) * 100}%`,
                width: `${seededRandom(seed + 2) * 3 + 1}px`,
                height: `${seededRandom(seed + 3) * 3 + 1}px`,
                animationDelay: `${seededRandom(seed + 4) * 3}s`,
                animationDuration: `${2 + seededRandom(seed + 5) * 3}s`,
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

        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => {
          const seed = i * 0.2;
          return (
            <div
              key={`particle-${i}`}
              className="particle absolute w-2 h-2 bg-orange-500/30 rounded-full"
              style={{
                left: `${seededRandom(seed) * 100}%`,
                top: `${100 + seededRandom(seed + 1) * 20}%`,
                animationDelay: `${seededRandom(seed + 2) * 5}s`,
                animationDuration: `${15 + seededRandom(seed + 3) * 10}s`,
              }}
            />
          );
        })}
      </div>

      {/* Hero Section - Full Viewport */}
      <section className="relative z-10 h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="text-center max-w-6xl mx-auto w-full">
          {/* Enhanced Logo with Subtle Glow */}
          <div className="mb-2 sm:mb-3 animate-slide-up relative">
            <div className="relative inline-block">
              {/* Single subtle glow layer */}
              <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-15 -z-10"></div>
              
              {/* Rotating ring effect - more subtle */}
              <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] border border-orange-500/15 rounded-full animate-spin-slow"></div>
              </div>
              
              {/* Logo with subtle effects - smaller */}
              <div className="relative z-10">
                <img
                  src="/BlastWheels_Logo_512.png"
                  alt="Blast Wheels"
                  width={140}
                  height={140}
                  className="relative z-10 object-contain transition-all duration-500 hover:scale-105 hover:rotate-3 mx-auto animate-float"
                  style={{ 
                    maxWidth: 'min(140px, 20vw)',
                    filter: 'drop-shadow(0 0 15px rgba(249, 115, 22, 0.3))'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Enhanced Animated Title with Subtle Effects */}
          <div className="mb-1 sm:mb-2 animate-slide-up relative" style={{ animationDelay: '0.1s' }}>
            <div className="relative inline-block">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white mb-1 sm:mb-2 bg-gradient-to-r from-orange-300 via-orange-500 via-yellow-400 to-orange-600 bg-clip-text text-transparent rotate-gradient relative z-10 tracking-tight leading-none">
                $WHEELS
              </h1>
              {/* Single subtle glow layer */}
              <span className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 blur-2xl opacity-15 -z-10"></span>
              {/* Animated underline */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-gradient-to-r from-transparent via-orange-500/60 to-transparent animate-expand"></div>
            </div>
          </div>
          
          {/* Enhanced Subtitle */}
          <div className="animate-fade-in mb-1 sm:mb-2" style={{ animationDelay: '0.3s' }}>
            <div className="relative inline-block">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-1 sm:mb-2 animate-float relative z-10 tracking-tight">
                <span className="bg-gradient-to-r from-white via-orange-100 to-white bg-clip-text text-transparent">
                  Blast Wheels
                </span>
              </h2>
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/10 via-yellow-400/10 to-orange-600/10 rounded-2xl blur-xl -z-10"></div>
              {/* Decorative elements */}
              <div className="absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 text-orange-500 text-xl sm:text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>🏁</div>
              <div className="absolute -right-4 sm:-right-6 top-1/2 -translate-y-1/2 text-orange-500 text-xl sm:text-2xl animate-bounce" style={{ animationDelay: '0.7s' }}>🏁</div>
            </div>
          </div>

          {/* Enhanced Tagline */}
          <div className="animate-slide-up mb-2 sm:mb-3" style={{ animationDelay: '0.5s' }}>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-1 leading-tight font-bold">
              The Ultimate{' '}
              <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent animate-gradient">
                Play-to-Earn
              </span>{' '}
              Racing Game! 🏁
            </p>
          </div>

          {/* Enhanced Description - Condensed */}
          <div className="animate-slide-up mb-2 sm:mb-3" style={{ animationDelay: '0.7s' }}>
            <p className="text-sm sm:text-base text-white/80 mb-2 max-w-3xl mx-auto leading-snug font-medium">
              Climb the leaderboard, challenge your friends in live online races, and upgrade your garage with powerful cars & upgrades. 
              With built-in wallet integration, earning and spending your <span className="text-orange-400 font-bold">$WHEELS</span> is seamless.
            </p>
          </div>
          
          {/* Enhanced CTA Badge - Compact */}
          <div className="animate-fade-in" style={{ animationDelay: '0.9s' }}>
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/15 via-yellow-400/15 to-orange-600/15 rounded-full blur-xl -z-10"></div>
              <p className="text-base sm:text-lg md:text-xl font-extrabold text-orange-300 px-4 sm:px-6 md:px-8 py-1.5 sm:py-2 md:py-3 bg-gradient-to-r from-orange-500/30 via-orange-600/30 to-orange-500/30 rounded-full border-2 border-orange-400/60 relative z-10 shadow-lg shadow-orange-500/30 backdrop-blur-sm">
                🔥 Real Interaction, Real Rewards 🔥
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contract Address Section - Below Hero */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-6xl mx-auto">
          {/* Contract Address with Enhanced Design */}
          <div 
            className="glass border border-orange-500/30 rounded-xl p-6 mb-12 max-w-2xl mx-auto hover-3d glow-orange-hover transition-all duration-300 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <p className="text-white/60 text-sm mb-3 font-semibold">Contract Address:</p>
            <div className="flex items-center justify-center space-x-3 flex-wrap gap-2">
              <code className="text-white/90 text-xs sm:text-sm font-mono bg-white/5 px-4 py-2 rounded-lg border border-white/10 break-all relative overflow-hidden">
                <span className="shimmer absolute inset-0"></span>
                <span className="relative z-10">0x6a9c2ded791f1eea4c23ac9bc3dbebf3e5b9f828a9837c9dd62d5e5698aac3ee::wheels::WHEELS</span>
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
                className="text-white/60 hover:text-orange-500 transition-all px-3 py-2 rounded-lg hover:bg-orange-500/10 transform hover:scale-110"
                title="Copy contract address"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Ultra Enhanced BUY $WHEELS Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-20">
            {Array.from({ length: 36 }).map((_, i) => (
              <button
                key={i}
                className="group relative px-5 py-4 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold rounded-xl transition-all duration-300 transform hover:scale-110 hover:rotate-1 shadow-lg shadow-orange-500/40 hover:shadow-orange-500/60 text-sm sm:text-base overflow-hidden"
                style={{ 
                  animationDelay: `${i * 0.03}s`,
                  animation: isVisible[`button-${i}`] ? 'slide-up 0.6s ease-out forwards' : 'none',
                  opacity: isVisible[`button-${i}`] ? 1 : 0,
                }}
              >
                {/* Multiple shimmer layers */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                <span className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-yellow-400/20 to-orange-400/0 group-hover:via-yellow-400/40 transition-all duration-500"></div>
                <span className="relative z-10 flex items-center justify-center space-x-1">
                  <span>BUY</span>
                  <span className="text-yellow-300">$WHEELS</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Chart Section with Animation */}
      <section 
        id="chart" 
        ref={setRef('chart')}
        className={`relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-orange-500/20 transition-all duration-1000 ${
          isVisible.chart ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="text-center">
          <h2 className="text-5xl sm:text-6xl font-extrabold text-white mb-12 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent relative">
            Chart
          </h2>
          <div className="glass border border-orange-500/20 rounded-xl p-12 min-h-[400px] flex items-center justify-center hover-3d transition-all duration-300">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center animate-pulse-glow">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-white/60 text-lg">Chart integration coming soon...</p>
            </div>
          </div>
        </div>
      </section>

      {/* Partnerships/Sponsors Section */}
      <section 
        id="partnerships" 
        ref={setRef('partnerships')}
        className={`relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-orange-500/20 transition-all duration-1000 ${
          isVisible.partnerships ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="text-center">
          <h2 className="text-5xl sm:text-6xl font-extrabold text-white mb-12 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent relative">
            Partnerships/Sponsors
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="glass border border-orange-500/20 rounded-xl p-8 h-32 flex items-center justify-center hover:border-orange-500/50 transition-all duration-300 hover-3d glow-orange-hover group"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-full flex items-center justify-center group-hover:from-orange-500/40 group-hover:to-orange-600/40 transition-all duration-300">
                  <p className="text-white/40 group-hover:text-orange-500 text-sm font-bold transition-colors">Partner {i}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join The Race Section */}
      <section 
        id="join" 
        ref={setRef('join')}
        className={`relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-orange-500/20 transition-all duration-1000 ${
          isVisible.join ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl sm:text-6xl font-extrabold text-white mb-16 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent relative">
            Join The Race!
          </h2>
          
          <div className="space-y-16">
            {/* Step 1 */}
            <div className="glass border-2 border-orange-500/30 rounded-2xl p-8 text-left hover-3d transition-all duration-300 group">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-4">Step 1</h3>
                  <div className="space-y-3 text-white/80">
                    <p><strong className="text-orange-500">Mobile Users:</strong> Download the Phantom app for free.</p>
                    <p><strong className="text-orange-500">Desktop Users:</strong> Download the Phantom chrome extension</p>
                    <p>Fund your wallet with Sui. You can buy Sui from an exchange or cross chain swap and send it to your wallet.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="glass border-2 border-orange-500/30 rounded-2xl p-8 text-left hover-3d transition-all duration-300 group">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-4">Step 2</h3>
                  <div className="space-y-3 text-white/80">
                    <p>Go to the Blast.fun platform with your phantom browser and swap your Sui for $WHEELS</p>
                    <div className="mt-4">
                      <button className="group relative px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-110 shadow-lg shadow-orange-500/50 hover:shadow-orange-500/80 overflow-hidden">
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                        <span className="relative z-10">🪖 Click The Helmet Below</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="glass border-2 border-orange-500/30 rounded-2xl p-8 text-left hover-3d transition-all duration-300 group">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-4">Step 3</h3>
                  <div className="space-y-3 text-white/80">
                    <p>You're all set! Join the Telegram and Play With The bot</p>
                    <p className="text-center text-orange-500 font-bold text-xl">Or</p>
                    <p>Click On The Launch Pad Below to Load The Blast Wheels Game!</p>
                    <div className="mt-4 flex flex-col sm:flex-row gap-4">
                      <button className="group relative px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-110 shadow-lg shadow-orange-500/50 hover:shadow-orange-500/80 overflow-hidden">
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                        <span className="relative z-10">Join Telegram</span>
                      </button>
                      <button className="group relative px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-110 shadow-lg shadow-orange-500/50 hover:shadow-orange-500/80 overflow-hidden">
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                        <span className="relative z-10">🚀 Launch Game</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section 
        id="roadmap" 
        ref={setRef('roadmap')}
        className={`relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-orange-500/20 transition-all duration-1000 ${
          isVisible.roadmap ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="text-center max-w-5xl mx-auto">
          <h2 className="text-5xl sm:text-6xl font-extrabold text-white mb-16 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent relative">
            Roadmap
          </h2>
          
          <div className="space-y-12">
            {/* Stage 1 */}
            <div className="glass border-2 border-orange-500/30 rounded-2xl p-8 text-left hover-3d transition-all duration-300 group">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform">
                  1
                </div>
                <h3 className="text-3xl font-bold text-white">Stage 1</h3>
              </div>
              <h4 className="text-xl font-semibold text-orange-500 mb-4">Early Stages & Development</h4>
              <p className="text-white/70 mb-4"><strong className="text-white">Goal:</strong> Build the foundation and foster transparency with the community.</p>
              <ul className="space-y-2 text-white/80 list-disc list-inside">
                <li>Launch on Blast.fun and onboard early holders for testing + feedback.</li>
                <li>Deploy official website and host regular Spaces to share progress.</li>
                <li>Core development: user interface, API integrations, Telegram bot, wallet integration, sound, tracks, graphics, and backend functions.</li>
              </ul>
            </div>

            {/* Stage 2 */}
            <div className="glass border-2 border-orange-500/30 rounded-2xl p-8 text-left hover-3d transition-all duration-300 group">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform">
                  2
                </div>
                <h3 className="text-3xl font-bold text-white">Stage 2</h3>
              </div>
              <h4 className="text-xl font-semibold text-orange-500 mb-4">Community Building</h4>
              <p className="text-white/70 mb-4"><strong className="text-white">Goal:</strong> Grow adoption and increase engagement.</p>
              <ul className="space-y-2 text-white/80 list-disc list-inside">
                <li>Pay DEX fees, boosts, and start targeted marketing.</li>
                <li>Onboard influencers to play and promote Blast Wheels.</li>
                <li>Daily Spaces, AMAs, and community tournaments for in-game activity.</li>
                <li>Expand marketing across Telegram, Twitter/X, and Discord.</li>
              </ul>
            </div>

            {/* Stage 3 */}
            <div className="glass border-2 border-orange-500/30 rounded-2xl p-8 text-left hover-3d transition-all duration-300 group">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-orange-500/50 group-hover:scale-110 transition-transform">
                  3
                </div>
                <h3 className="text-3xl font-bold text-white">Stage 3</h3>
              </div>
              <h4 className="text-xl font-semibold text-orange-500 mb-4">Full Release & Expansion</h4>
              <p className="text-white/70 mb-4"><strong className="text-white">Goal:</strong> Scale globally and integrate with mainstream gaming.</p>
              <ul className="space-y-2 text-white/80 list-disc list-inside">
                <li>Launch full game on PC & Mobile, with live multiplayer and Sui wallet integration.</li>
                <li>Global marketing push: DEX Screener ads, Steam/Twitch streams, weekly influencer tournaments.</li>
                <li>Secure major exchange listings.</li>
                <li>Establish Blast Wheels as a strong brand in gaming, crypto, and esports.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
