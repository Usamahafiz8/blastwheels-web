'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { apiClient } from '@/lib/api';
import { NFT_CARS } from '@/lib/nft-cars';
import { buildMintTransaction, getCarTypeFromName, COLLECTION_ID, TRANSFER_POLICY_ID } from '@/lib/nft-mint';
import { suiClient } from '@/lib/sui';
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

export default function MarketplacePage() {
  const { user } = useAuth();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [cars, setCars] = useState<CarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCar, setSelectedCar] = useState<CarData | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [minting, setMinting] = useState(false);
  const [toast, setToast] = useState({ message: '', isVisible: false, type: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    try {
      // Start with static NFT_CARS as base (all available cars for minting)
      const baseCars: CarData[] = NFT_CARS.map((car) => ({
        name: car.name,
        description: car.description,
        image: car.image,
      }));

      // Try to load minted cars from API to mark which ones are already minted
      try {
        const response = await apiClient.getCars({ limit: 100 });
        
        if (response.data?.cars && response.data.cars.length > 0) {
          // Convert API cars to CarData format
          const apiCars: CarData[] = response.data.cars.map((car: any) => ({
            id: car.id,
            name: car.name,
            description: car.description || '',
            image: car.imageUrl || '',
            suiObjectId: car.suiObjectId,
            tokenId: car.tokenId,
            ownerAddress: car.ownerAddress,
          }));

          // Merge API cars with base cars
          // Only mark as minted if it has a suiObjectId (blockchain object ID)
          const mergedCars = baseCars.map((baseCar) => {
            const apiCar = apiCars.find((apiCar) => 
              apiCar.name === baseCar.name
            );
            
            // Only use API data if it has a suiObjectId (actually minted on blockchain)
            // Otherwise, use base data (available for minting)
            if (apiCar && apiCar.suiObjectId) {
              return apiCar;
            }
            return baseCar;
          });

          setCars(mergedCars);
        } else {
          // No API cars, use static data only (all available for minting)
          setCars(baseCars);
        }
      } catch (apiError) {
        console.error('Failed to load cars from API:', apiError);
        // Use static data if API fails (all available for minting)
        setCars(baseCars);
      }
    } catch (error) {
      console.error('Failed to load cars:', error);
      // Fallback to static data on error
      setCars(NFT_CARS.map((car) => ({
        name: car.name,
        description: car.description,
        image: car.image,
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleBuyClick = (car: CarData) => {
    if (!user || !account?.address) {
      setToast({
        message: 'Please connect your wallet and login to mint',
        isVisible: true,
        type: 'error',
      });
      return;
    }

    // If car already exists on blockchain (minted), show message and redirect to collection
    // Only check suiObjectId - this indicates the NFT exists on the blockchain
    if (car.suiObjectId) {
      setToast({
        message: 'This NFT is already minted. View it in your Collection.',
        isVisible: true,
        type: 'success',
      });
      // Redirect to collection page after 2 seconds
      setTimeout(() => {
        window.location.href = '/collection';
      }, 2000);
      return;
    }

    setSelectedCar(car);
    setShowMintModal(true);
  };

  const handleMint = async () => {
    if (!selectedCar || !account?.address) return;

    setMinting(true);
    try {
      // Build mint transaction
      const tx = buildMintTransaction({
        carType: selectedCar.name,
        collectionId: COLLECTION_ID,
        transferPolicyId: TRANSFER_POLICY_ID,
        name: selectedCar.name,
        imageUrl: selectedCar.image.startsWith('/') ? selectedCar.image : `/${selectedCar.image}`,
        projectUrl: 'https://blastwheels.com', // Default project URL
        alloyRim: 'Default', // These can be customized later
        frontBonnet: 'Default',
        backBonnet: 'Default',
        ownerAddress: account.address,
      });

      // Execute transaction with options to get objectChanges (same as script)
      signAndExecute(
        {
          transaction: tx,
          options: {
            showObjectChanges: true,
            showEffects: true,
            showEvents: true,
            showBalanceChanges: true,
            showInput: true,
          },
        },
        {
          onSuccess: async (result) => {
            const txHash = result.digest;
            
            try {
              // Log full result for debugging
              console.log('Transaction result:', result);
              
              // onSuccess callback is only called when transaction succeeds
              // Proceed with extracting NFT information

              // Use objectChanges directly from result (same as script - no need to refetch)
              const objectChanges = result.objectChanges || [];
              
              // Find shared kiosk (same as script)
              const sharedKiosk = objectChanges.find((change: any) => {
                const isKiosk = change.objectType?.includes('kiosk::Kiosk');
                const isShared = change.owner && 'Shared' in change.owner;
                return isKiosk && isShared;
              });

              // Find created NFT (same as script)
              const createdNFT = objectChanges.find(
                (change: any) => change.type === 'created' && change.objectType?.includes('::blastwheelz::NFT')
              );

              // Find created kiosk owner cap (same as script)
              const createdKioskCap = objectChanges.find(
                (change: any) => change.type === 'created' && change.objectType?.includes('kiosk::KioskOwnerCap')
              );

              // Extract NFT object ID
              let nftObjectId: string | null = null;
              
              if (createdNFT?.objectId) {
                nftObjectId = createdNFT.objectId;
              } else if (sharedKiosk?.objectId) {
                // Use kiosk ID as reference if NFT not found directly
                nftObjectId = sharedKiosk.objectId;
              } else {
                // Fallback: use transaction hash
                nftObjectId = txHash;
              }
              
              // Create car record in database
              const createResponse = await apiClient.registerMintedCar({
                tokenId: nftObjectId, // Use object ID as token ID
                suiObjectId: nftObjectId,
                ownerAddress: account.address,
                name: selectedCar.name,
                description: selectedCar.description,
                imageUrl: selectedCar.image.startsWith('/') ? selectedCar.image : `/${selectedCar.image}`,
                projectUrl: 'https://blastwheels.com',
                mintNumber: 1, // This should be retrieved from the collection if possible
                alloyRim: 'Default',
                frontBonnet: 'Default',
                backBonnet: 'Default',
                creator: account.address,
                collectionId: COLLECTION_ID,
              });

              if (createResponse.error) {
                setToast({
                  message: `Mint successful but failed to register: ${createResponse.error}`,
                  isVisible: true,
                  type: 'error',
                });
              } else {
                setToast({
                  message: 'NFT minted successfully!',
                  isVisible: true,
                  type: 'success',
                });
                setShowMintModal(false);
                loadCars();
              }
            } catch (error: any) {
              console.error('Error registering minted NFT:', error);
              setToast({
                message: `Mint successful but failed to register: ${error.message}`,
                isVisible: true,
                type: 'error',
              });
            } finally {
              setMinting(false);
            }
          },
          onError: (error: any) => {
            console.error('Mint transaction error:', error);
            console.error('Full error details:', JSON.stringify(error, null, 2));
            
            // Extract more detailed error message
            let errorMessage = 'Unknown error';
            if (error.message) {
              errorMessage = error.message;
            } else if (error.toString && error.toString() !== '[object Object]') {
              errorMessage = error.toString();
            } else if (error.code) {
              errorMessage = `Error code: ${error.code}`;
            }
            
            // Check for common Sui transaction errors
            if (errorMessage.includes('Invalid identifier')) {
              errorMessage = 'Invalid function identifier. Check package ID and module name.';
            } else if (errorMessage.includes('does not exist')) {
              errorMessage = 'Object does not exist. Check Collection ID and Transfer Policy ID.';
            } else if (errorMessage.includes('insufficient gas')) {
              errorMessage = 'Insufficient gas. Please add more SUI to your wallet.';
            }
            
            setToast({
              message: `Mint failed: ${errorMessage}`,
              isVisible: true,
              type: 'error',
            });
            setMinting(false);
          },
        }
      );
    } catch (error: any) {
      console.error('Mint error:', error);
      setToast({
        message: error.message || 'Failed to build mint transaction',
        isVisible: true,
        type: 'error',
      });
      setMinting(false);
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

      {/* Marketplace Content */}
      <section className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-8 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 sm:mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              🛒 NFT Marketplace
            </h1>
            <p className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto">
              Secure on-chain buying, selling & trading
            </p>
          </div>

          {/* NFT Cars Grid */}
          <div>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-white/60">Loading NFTs...</p>
              </div>
            ) : cars.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60">No NFTs available at the moment</p>
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
                    </div>
                    <div className="p-4 sm:p-5">
                      <h3 className="text-lg sm:text-xl font-extrabold text-white mb-2 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                        {car.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/70 leading-relaxed line-clamp-3 mb-4">
                        {car.description}
                      </p>
                      <button
                        onClick={() => handleBuyClick(car)}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md shadow-orange-500/30 text-sm"
                      >
                        {car.suiObjectId ? 'Already Minted' : 'Mint Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mint Modal */}
      {showMintModal && selectedCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="glass border-2 border-orange-500/30 rounded-lg p-6 sm:p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Mint NFT
            </h2>
            <p className="text-white/70 mb-6">
              Mint <strong className="text-white">{selectedCar.name}</strong> as an NFT. All configuration is pre-set.
            </p>
            
            <div className="mb-4 p-3 bg-white/5 border border-orange-500/20 rounded-lg">
              <label className="block text-xs font-medium text-white/60 mb-1">
                Collection ID (Pre-configured)
              </label>
              <p className="text-sm text-white/80 font-mono break-all">
                {COLLECTION_ID}
              </p>
            </div>

            <div className="mb-6 p-3 bg-white/5 border border-orange-500/20 rounded-lg">
              <label className="block text-xs font-medium text-white/60 mb-1">
                Transfer Policy ID (Pre-configured)
              </label>
              <p className="text-sm text-white/80 font-mono break-all">
                {TRANSFER_POLICY_ID}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMintModal(false);
                }}
                disabled={minting}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMint}
                disabled={minting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
              >
                {minting ? 'Minting...' : 'Mint NFT'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

