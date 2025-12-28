'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import Toast from '@/components/Toast';

interface CarData {
  id?: string;
  name: string;
  description: string;
  image: string;
  suiObjectId?: string;
  tokenId?: string;
  ownerAddress?: string;
  price?: string;
}

export default function CollectionPage() {
  const { user } = useAuth();
  const [cars, setCars] = useState<CarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', isVisible: false, type: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    try {
      // Load only minted cars from API
      const response = await apiClient.getCars({ limit: 100 });
      
      if (response.data?.cars && response.data.cars.length > 0) {
        // Convert API cars to CarData format
        // Only include cars that have a suiObjectId (actually minted on blockchain)
        const apiCars: CarData[] = response.data.cars
          .filter((car: any) => car.suiObjectId) // Only show NFTs with blockchain object ID
          .map((car: any) => ({
            id: car.id,
            name: car.name,
            description: car.description || '',
            image: car.imageUrl || '',
            suiObjectId: car.suiObjectId,
            tokenId: car.tokenId,
            ownerAddress: car.ownerAddress,
          }));
        setCars(apiCars);
      } else {
        setCars([]);
      }
    } catch (error) {
      console.error('Failed to load cars:', error);
      setCars([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-500/20 via-orange-600/15 to-orange-500/20 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute top-3/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-600/20 via-orange-500/15 to-orange-600/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-[500px] h-[500px] bg-gradient-to-r from-orange-500/20 via-orange-600/15 to-orange-500/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Collection Content */}
      <section className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 sm:mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              🎨 NFT Collection
            </h1>
            <p className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto">
              View your minted NFT collection
            </p>
          </div>

          {/* NFT Cars Grid */}
          <div>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-white/60">Loading collection...</p>
              </div>
            ) : cars.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60 mb-4">No minted NFTs in your collection yet</p>
                <a
                  href="/marketplace"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  Go to Marketplace to Mint
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {cars.map((car, index) => (
                  <div
                    key={car.id || car.tokenId || index}
                    className="glass border-2 border-orange-500/30 rounded-lg overflow-hidden hover-3d transition-all duration-300 hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20 group"
                  >
                    <div className="relative aspect-square overflow-hidden bg-black">
                      <img
                        src={car.image.startsWith('/') ? car.image : `/${car.image}`}
                        alt={car.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                      {car.suiObjectId && (
                        <div className="absolute top-2 right-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full font-bold">
                          Minted
                        </div>
                      )}
                    </div>
                    <div className="p-4 sm:p-5">
                      <h3 className="text-lg sm:text-xl font-extrabold text-white mb-2 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                        {car.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/70 leading-relaxed line-clamp-3 mb-4">
                        {car.description}
                      </p>
                      {car.ownerAddress && (
                        <p className="text-xs text-white/50 mb-2">
                          Owner: {car.ownerAddress.slice(0, 6)}...{car.ownerAddress.slice(-4)}
                        </p>
                      )}
                      {car.tokenId && (
                        <p className="text-xs text-white/50 font-mono">
                          Token: {car.tokenId.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

