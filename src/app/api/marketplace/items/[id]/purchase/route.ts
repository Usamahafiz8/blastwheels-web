import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { mintNFTOnChain } from '@/lib/nft-mint-service';
import { verifyPurchaseAndMintTransaction } from '@/lib/nft-purchase-transaction';
import { verifyMintTransaction } from '@/lib/nft-mint-transaction';

/**
 * @swagger
 * /api/marketplace/items/{id}/purchase:
 *   post:
 *     summary: Purchase a marketplace item (authenticated)
 *     tags: [Marketplace]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Purchase successful
 *       400:
 *         description: Invalid request (insufficient balance, out of stock, etc.)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await context.params;
    const body = await req.json();
    const { quantity = 1, paymentTxHash, mintTxHash, useDatabaseBalance = false, imageUrl } = body as { 
      quantity?: number; 
      paymentTxHash?: string;
      mintTxHash?: string;
      useDatabaseBalance?: boolean;
      imageUrl?: string;
    };

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    // Get item with current user balance
    const [item, userWithBalance] = await Promise.all([
      prisma.marketplaceItem.findUnique({
        where: { id },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { blastwheelzBalance: true },
      }),
    ]);

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (item.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Item is not available for purchase' },
        { status: 400 }
      );
    }

    // Check stock
    if (item.stock !== null && item.stock < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock available' },
        { status: 400 }
      );
    }

    // Calculate total price
    const totalPrice = Number(item.price) * quantity;
    const totalPriceInSmallestUnit = BigInt(Math.floor(totalPrice * 1_000_000_000));

    // For NFT items, handle minting
    let nftVerificationResult: any = null;
    if (item.type === 'NFT') {
      // For now, NFT purchases are limited to quantity 1 per transaction
      // Multiple NFTs require multiple transactions
      if (quantity > 1) {
        return NextResponse.json(
          { error: 'NFT purchases are limited to quantity 1 per transaction. Please purchase multiple NFTs separately.' },
          { status: 400 }
        );
      }

      // Check if using database balance or wallet payment
      if (useDatabaseBalance) {
        // Check database balance
        const userBalance = Number(userWithBalance?.blastwheelzBalance || 0);
        if (userBalance < totalPrice) {
          return NextResponse.json(
            {
              error: 'Insufficient balance',
              required: totalPrice,
              available: userBalance,
            },
            { status: 400 }
          );
        }

        // Verify user has wallet address for NFT transfer
        if (!user.walletAddress) {
          return NextResponse.json(
            { error: 'Wallet address is required to receive NFTs. Please set your wallet address in your profile.' },
            { status: 400 }
          );
        }

        // If mintTxHash is provided, verify user's mint transaction
        // If not provided, admin wallet will mint (handled after purchase)
        if (mintTxHash) {
          nftVerificationResult = await verifyMintTransaction(
            mintTxHash,
            user.walletAddress,
            item.name
          );

          if (!nftVerificationResult.isValid) {
            return NextResponse.json(
              { 
                error: nftVerificationResult.error || 'Mint transaction verification failed',
              },
              { status: 400 }
            );
          }

          // Verify we got the NFT details
          if (!nftVerificationResult.nftObjectId || !nftVerificationResult.kioskOwnerCapId) {
            return NextResponse.json(
              { error: 'NFT minting verification failed. NFT details not found in transaction.' },
              { status: 400 }
            );
          }
        }
        // If no mintTxHash, admin wallet will mint after purchase (see below)
      } else {
        // Using wallet payment - verify transaction
        if (!paymentTxHash) {
          return NextResponse.json(
            { error: 'Transaction hash is required for wallet-based NFT purchases' },
            { status: 400 }
          );
        }

        // Check if transaction hash already exists
        const existingTx = await prisma.transaction.findUnique({
          where: { suiTxHash: paymentTxHash },
        });

        if (existingTx) {
          return NextResponse.json(
            { error: 'Transaction hash already processed' },
            { status: 400 }
          );
        }

        // Verify combined purchase and mint transaction
        const metadata = (item.metadata as any) || {};
        nftVerificationResult = await verifyPurchaseAndMintTransaction(
          paymentTxHash,
          totalPriceInSmallestUnit,
          user.walletAddress,
          item.name
        );

        if (!nftVerificationResult.isValid) {
          return NextResponse.json(
            { 
              error: nftVerificationResult.error || 'Transaction verification failed',
              details: {
                paymentVerified: nftVerificationResult.paymentVerified,
                mintVerified: nftVerificationResult.mintVerified,
              }
            },
            { status: 400 }
          );
        }

        // Verify we got the NFT details
        if (!nftVerificationResult.nftObjectId || !nftVerificationResult.kioskOwnerCapId) {
          return NextResponse.json(
            { error: 'NFT minting verification failed. NFT details not found in transaction.' },
            { status: 400 }
          );
        }
      }
    } else {
      // For non-NFT items, check database balance
      const userBalance = Number(userWithBalance?.blastwheelzBalance || 0);
      if (userBalance < totalPrice) {
        return NextResponse.json(
          {
            error: 'Insufficient balance',
            required: totalPrice,
            available: userBalance,
          },
          { status: 400 }
        );
      }
    }

    // Process purchase in transaction with increased timeout (30 seconds)
    // The transaction includes multiple database operations that may take time
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from database balance for non-NFT items or NFT items using database balance
      let updatedUser;
      if (item.type !== 'NFT' || useDatabaseBalance) {
        updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            blastwheelzBalance: {
              decrement: totalPrice,
            },
          },
          select: {
            blastwheelzBalance: true,
          },
        });
      } else {
        // For NFT items with wallet payment, balance is already deducted from crypto wallet
        updatedUser = await tx.user.findUnique({
          where: { id: user.id },
          select: {
            blastwheelzBalance: true,
          },
        });
      }

      // Update item stock and sold count
      const updateData: any = {
        soldCount: { increment: quantity },
      };
      if (item.stock !== null) {
        updateData.stock = { decrement: quantity };
        // Auto-update status if stock reaches 0
        if (item.stock - quantity === 0) {
          updateData.status = 'SOLD_OUT';
        }
      }

      const updatedItem = await tx.marketplaceItem.update({
        where: { id },
        data: updateData,
      });

      // Create purchase record
      const purchase = await tx.marketplacePurchase.create({
        data: {
          itemId: id,
          userId: user.id,
          price: item.price,
          quantity,
          metadata: {
            itemName: item.name,
            itemType: item.type,
            totalPrice,
          },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'MARKETPLACE_PURCHASE',
          amount: totalPrice.toString(),
          suiTxHash: mintTxHash || paymentTxHash || null,
          status: 'COMPLETED',
          metadata: {
            itemId: id,
            itemName: item.name,
            purchaseId: purchase.id,
            quantity,
            paymentMethod: item.type === 'NFT' 
              ? (useDatabaseBalance ? 'database_balance' : 'crypto_wallet')
              : 'database_balance',
          },
        },
      });

      return { updatedUser, updatedItem, purchase };
    }, {
      maxWait: 30000, // Maximum time to wait for a transaction slot (30 seconds)
      timeout: 30000, // Maximum time the transaction can run (30 seconds)
    });

    // For NFT items, save NFT from user's mint transaction, admin wallet mint, or verify wallet payment transaction
    if (item.type === 'NFT') {
      // Case 1: User minted NFT themselves (useDatabaseBalance = true with mintTxHash)
      if (useDatabaseBalance && nftVerificationResult && nftVerificationResult.nftObjectId) {
        // NFT was already minted by user's wallet transaction, just save it
        try {
          console.log(`💾 Saving NFT to database from user's mint transaction ${mintTxHash}...`);
          // Get car type and collection ID for this NFT
          const { getCarTypeFromName } = await import('@/lib/nft-mint');
          const { getCollectionId } = await import('@/lib/collection-map');
          const carType = getCarTypeFromName(item.name);
          const collectionId = getCollectionId(carType);
          
          const metadata = (item.metadata as any) || {};
          
          // Store NFT in database
          const createdNFT = await prisma.nFT.create({
            data: {
              tokenId: nftVerificationResult.nftObjectId,
              suiObjectId: nftVerificationResult.nftObjectId,
              collectionId: collectionId,
              name: item.name,
              description: item.description,
              imageUrl: item.imageUrl,
              projectUrl: metadata.projectUrl || 'https://blastwheelz.io',
              ownerAddress: user.walletAddress,
              creator: user.walletAddress,
              alloyRim: metadata.rim || 'Standard Alloy Rims',
              frontBonnet: metadata.texture || 'Standard Texture',
              backBonnet: metadata.speed || 'Standard Speed',
              metadata: {
                purchaseId: result.purchase.id,
                kioskId: nftVerificationResult.kioskId,
                kioskOwnerCapId: nftVerificationResult.kioskOwnerCapId,
                transactionDigest: mintTxHash,
                carType: carType,
                rim: metadata.rim || 'Standard Alloy Rims',
                texture: metadata.texture || 'Standard Texture',
                speed: metadata.speed || 'Standard Speed',
                brake: metadata.brake || 'Standard Brakes',
                control: metadata.control || 'Standard Control',
              },
            },
          });
          
          // Update transaction record - find by purchaseId in metadata
          // Prisma JSON filtering is limited, so we fetch and filter in code
          const transactions = await prisma.transaction.findMany({
            where: {
              userId: user.id,
              type: 'MARKETPLACE_PURCHASE',
              createdAt: {
                gte: new Date(Date.now() - 60000), // Within last minute
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          });

          const transaction = transactions.find((tx) => {
            const txMetadata = tx.metadata as any;
            return txMetadata?.purchaseId === result.purchase.id;
          });

          if (transaction) {
            await prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                suiTxHash: mintTxHash,
                metadata: {
                  ...(transaction.metadata as any || {}),
                  itemId: id,
                  itemName: item.name,
                  purchaseId: result.purchase.id,
                  quantity: quantity,
                  paymentMethod: 'database_balance',
                  nftId: createdNFT.id,
                  nftTokenId: createdNFT.tokenId,
                  nftSuiObjectId: createdNFT.suiObjectId,
                  nftMintTxDigest: mintTxHash,
                  kioskId: nftVerificationResult.kioskId,
                  kioskOwnerCapId: nftVerificationResult.kioskOwnerCapId,
                },
              },
            });
          }
          
          console.log(`✅ NFT saved to database: ${nftVerificationResult.nftObjectId}`);
        } catch (saveError: any) {
          console.error('❌ Error saving NFT to database:', saveError);
          // Refund the balance since saving failed
          await prisma.user.update({
            where: { id: user.id },
            data: {
              blastwheelzBalance: {
                increment: totalPrice,
              },
            },
          });
          throw new Error(`Failed to save NFT: ${saveError.message}`);
        }
      } 
      // Case 2: Admin wallet mints NFT (useDatabaseBalance = true without mintTxHash)
      else if (useDatabaseBalance && !mintTxHash) {
        try {
          console.log(`🎨 Admin wallet minting NFT on-chain for purchase ${result.purchase.id}...`);
          console.log(`💰 Admin wallet will pay for gas and minting costs`);
          
          // Get metadata from item or use defaults
          const metadata = (item.metadata as any) || {};
          
          // Use imageUrl from request body if provided, otherwise fall back to item.imageUrl
          const finalImageUrl = imageUrl || item.imageUrl || '';
          
          // Mint NFT using admin wallet
          const mintResult = await mintNFTOnChain({
            carName: item.name,
            imageUrl: finalImageUrl,
            projectUrl: metadata.projectUrl || 'https://blastwheelz.io',
            rim: metadata.rim || 'Standard Alloy Rims',
            texture: metadata.texture || 'Standard Texture',
            speed: metadata.speed || 'Standard Speed',
            brake: metadata.brake || 'Standard Brakes',
            control: metadata.control || 'Standard Control',
            ownerAddress: user.walletAddress,
          });

          if (mintResult.success && mintResult.nftObjectId) {
            // Get car type and collection ID for this NFT
            const { getCarTypeFromName } = await import('@/lib/nft-mint');
            const { getCollectionId } = await import('@/lib/collection-map');
            const carType = getCarTypeFromName(item.name);
            const collectionId = getCollectionId(carType);
            
            // Store NFT in database
            const createdNFT = await prisma.nFT.create({
              data: {
                tokenId: mintResult.nftObjectId,
                suiObjectId: mintResult.nftObjectId,
                collectionId: collectionId,
                name: item.name,
                description: item.description,
                imageUrl: finalImageUrl, // Use the same imageUrl that was used for minting
                projectUrl: metadata.projectUrl || 'https://blastwheelz.io',
                ownerAddress: user.walletAddress,
                creator: user.walletAddress,
                alloyRim: metadata.rim || 'Standard Alloy Rims',
                frontBonnet: metadata.texture || 'Standard Texture',
                backBonnet: metadata.speed || 'Standard Speed',
                metadata: {
                  purchaseId: result.purchase.id,
                  kioskId: mintResult.kioskId,
                  kioskOwnerCapId: mintResult.kioskOwnerCapId,
                  transactionDigest: mintResult.transactionDigest,
                  paidByAdmin: true, // Mark that admin wallet paid
                  carType: carType,
                  rim: metadata.rim || 'Standard Alloy Rims',
                  texture: metadata.texture || 'Standard Texture',
                  speed: metadata.speed || 'Standard Speed',
                  brake: metadata.brake || 'Standard Brakes',
                  control: metadata.control || 'Standard Control',
                },
              },
            });
            
            // Update transaction record with mint hash
            const transactions = await prisma.transaction.findMany({
              where: {
                userId: user.id,
                type: 'MARKETPLACE_PURCHASE',
                createdAt: {
                  gte: new Date(Date.now() - 60000), // Within last minute
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
            });

            const transaction = transactions.find((tx) => {
              const txMetadata = tx.metadata as any;
              return txMetadata?.purchaseId === result.purchase.id;
            });

            if (transaction && mintResult.transactionDigest) {
              await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                  suiTxHash: mintResult.transactionDigest,
                  metadata: {
                    ...(transaction.metadata as any || {}),
                    nftId: createdNFT.id,
                    nftTokenId: createdNFT.tokenId,
                    nftSuiObjectId: createdNFT.suiObjectId,
                    nftMintTxDigest: mintResult.transactionDigest,
                    kioskId: mintResult.kioskId,
                    kioskOwnerCapId: mintResult.kioskOwnerCapId,
                    paidByAdmin: true,
                  },
                },
              });
            }
            
            console.log(`✅ NFT minted by admin wallet and stored: ${mintResult.nftObjectId}`);
            
            // Update nftVerificationResult for response
            nftVerificationResult = {
              isValid: true,
              nftObjectId: mintResult.nftObjectId,
              kioskId: mintResult.kioskId,
              kioskOwnerCapId: mintResult.kioskOwnerCapId,
            };
          } else {
            console.error(`❌ Failed to mint NFT: ${mintResult.error}`);
            // Refund the balance since minting failed
            await prisma.user.update({
              where: { id: user.id },
              data: {
                blastwheelzBalance: {
                  increment: totalPrice,
                },
              },
            });
            throw new Error(`Failed to mint NFT: ${mintResult.error || 'Unknown error'}`);
          }
        } catch (mintError: any) {
          console.error('❌ Error minting NFT on-chain:', mintError);
          // Refund the balance since minting failed
          await prisma.user.update({
            where: { id: user.id },
            data: {
              blastwheelzBalance: {
                increment: totalPrice,
              },
            },
          });
          throw new Error(`Failed to mint NFT: ${mintError.message || 'Unknown error'}`);
        }
      } 
      // Case 3: User paid from wallet (useDatabaseBalance = false with paymentTxHash)
      else if (nftVerificationResult && nftVerificationResult.nftObjectId) {
        // Save NFT from wallet transaction
      try {
        console.log(`💾 Saving NFT to database from transaction ${paymentTxHash}...`);
        
        // Get metadata from item or use defaults
        const metadata = (item.metadata as any) || {};
        
        // Get car type and collection ID for this NFT
        const { getCarTypeFromName } = await import('@/lib/nft-mint');
        const { getCollectionId } = await import('@/lib/collection-map');
        const carType = getCarTypeFromName(item.name);
        const collectionId = getCollectionId(carType);
        
        // Store NFT in database with all details
        const createdNFT = await prisma.nFT.create({
          data: {
            tokenId: nftVerificationResult.nftObjectId,
            suiObjectId: nftVerificationResult.nftObjectId,
            collectionId: collectionId,
            name: item.name,
            description: item.description,
            imageUrl: item.imageUrl,
            projectUrl: metadata.projectUrl || 'https://blastwheelz.io',
            ownerAddress: user.walletAddress,
            creator: user.walletAddress,
            alloyRim: metadata.rim || 'Standard Alloy Rims',
            frontBonnet: metadata.texture || 'Standard Texture',
            backBonnet: metadata.speed || 'Standard Speed',
            metadata: {
              purchaseId: result.purchase.id,
              kioskId: nftVerificationResult.kioskId,
              kioskOwnerCapId: nftVerificationResult.kioskOwnerCapId,
              transactionDigest: paymentTxHash,
              carType: carType,
              rim: metadata.rim || 'Standard Alloy Rims',
              texture: metadata.texture || 'Standard Texture',
              speed: metadata.speed || 'Standard Speed',
              brake: metadata.brake || 'Standard Brakes',
              control: metadata.control || 'Standard Control',
            },
          },
        });
        
        // Update transaction record to include NFT details
        await prisma.transaction.updateMany({
          where: {
            suiTxHash: paymentTxHash,
            userId: user.id,
          },
          data: {
            metadata: {
              itemId: id,
              itemName: item.name,
              purchaseId: result.purchase.id,
              quantity: quantity,
              paymentMethod: 'crypto_wallet',
              nftId: createdNFT.id,
              nftTokenId: createdNFT.tokenId,
              nftSuiObjectId: createdNFT.suiObjectId,
              nftMintTxDigest: paymentTxHash,
              kioskId: nftVerificationResult.kioskId,
              kioskOwnerCapId: nftVerificationResult.kioskOwnerCapId,
            },
          },
        });
        
        console.log(`✅ NFT saved to database: ${nftVerificationResult.nftObjectId}`);
      } catch (saveError: any) {
        console.error('❌ Error saving NFT to database:', saveError);
        // Don't fail the purchase - transaction already succeeded
      }
      }
    }

    return NextResponse.json({
      message: 'Purchase successful',
      purchase: {
        id: result.purchase.id,
        itemName: item.name,
        quantity,
        totalPrice,
        remainingBalance: result.updatedUser?.blastwheelzBalance?.toString() || '0',
      },
      nft: item.type === 'NFT' && nftVerificationResult ? {
        success: true,
        nftObjectId: nftVerificationResult.nftObjectId,
        kioskId: nftVerificationResult.kioskId,
        kioskOwnerCapId: nftVerificationResult.kioskOwnerCapId,
        transactionDigest: mintTxHash || paymentTxHash || nftVerificationResult.transactionDigest,
        paidByAdmin: useDatabaseBalance && !mintTxHash, // True if admin wallet minted
      } : undefined,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Purchase marketplace item error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

