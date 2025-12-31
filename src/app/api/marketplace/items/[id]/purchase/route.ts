import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyPurchaseTransaction } from '@/lib/treasury';
import { mintNFTOnChain, mintMultipleNFTs } from '@/lib/nft-mint-service';
import { suiClient, SUI_CONFIG } from '@/lib/sui';

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
    const { quantity = 1, paymentTxHash } = body as { quantity?: number; paymentTxHash?: string };

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

    // For NFT items, require payment transaction hash and verify payment from crypto wallet
    if (item.type === 'NFT') {
      if (!paymentTxHash) {
        return NextResponse.json(
          { error: 'Payment transaction hash is required for NFT purchases' },
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

      // Verify payment transaction
      const isValid = await verifyPurchaseTransaction(
        paymentTxHash,
        totalPriceInSmallestUnit,
        user.walletAddress
      );

      if (!isValid) {
        return NextResponse.json(
          { error: 'Payment transaction verification failed. Please ensure you sent the correct amount to the treasury.' },
          { status: 400 }
        );
      }

      // Check user's wallet balance for blastwheels tokens
      const coins = await suiClient.getCoins({
        owner: user.walletAddress,
        coinType: SUI_CONFIG.blastweelTokenType,
      });

      let walletBalance = BigInt(0);
      for (const coin of coins.data) {
        walletBalance += BigInt(coin.balance || '0');
      }

      if (walletBalance < totalPriceInSmallestUnit) {
        return NextResponse.json(
          {
            error: 'Insufficient wallet balance',
            required: totalPrice.toString(),
            available: (Number(walletBalance) / 1_000_000_000).toString(),
          },
          { status: 400 }
        );
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

    // Process purchase in transaction
    const result = await prisma.$transaction(async (tx) => {
      // For non-NFT items, deduct from database balance
      let updatedUser;
      if (item.type !== 'NFT') {
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
        // For NFT items, balance is already deducted from crypto wallet
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
          suiTxHash: paymentTxHash || null,
          status: 'COMPLETED',
          metadata: {
            itemId: id,
            itemName: item.name,
            purchaseId: purchase.id,
            quantity,
            paymentMethod: item.type === 'NFT' ? 'crypto_wallet' : 'database_balance',
          },
        },
      });

      return { updatedUser, updatedItem, purchase };
    });

    // After successful purchase, mint NFT on-chain if item type is NFT
    let mintResults: any[] = [];
    if (item.type === 'NFT' && user.walletAddress) {
      try {
        console.log(`🎨 Minting ${quantity} NFT(s) on-chain for purchase ${result.purchase.id}...`);
        
        // Get metadata from item or use defaults
        const metadata = (item.metadata as any) || {};
        
        if (quantity === 1) {
          // Single NFT mint
          const mintResult = await mintNFTOnChain({
            carName: item.name,
            imageUrl: item.imageUrl || '',
            projectUrl: metadata.projectUrl || 'https://blastwheelz.io',
            rim: metadata.rim || 'Standard Alloy Rims',
            texture: metadata.texture || 'Standard Texture',
            speed: metadata.speed || 'Standard Speed',
            brake: metadata.brake || 'Standard Brakes',
            control: metadata.control || 'Standard Control',
            ownerAddress: user.walletAddress,
          });

          if (mintResult.success && mintResult.nftObjectId) {
            // Store NFT in database
            await prisma.nFT.create({
              data: {
                tokenId: mintResult.nftObjectId,
                suiObjectId: mintResult.nftObjectId,
                name: item.name,
                description: item.description,
                imageUrl: item.imageUrl,
                ownerAddress: user.walletAddress,
                creator: user.walletAddress,
                metadata: {
                  purchaseId: result.purchase.id,
                  kioskId: mintResult.kioskId,
                  kioskOwnerCapId: mintResult.kioskOwnerCapId,
                  transactionDigest: mintResult.transactionDigest,
                  rim: metadata.rim || 'Standard Alloy Rims',
                  texture: metadata.texture || 'Standard Texture',
                  speed: metadata.speed || 'Standard Speed',
                  brake: metadata.brake || 'Standard Brakes',
                  control: metadata.control || 'Standard Control',
                },
              },
            });
            console.log(`✅ NFT minted and stored: ${mintResult.nftObjectId}`);
          } else {
            console.error(`❌ Failed to mint NFT: ${mintResult.error}`);
          }
          mintResults = [mintResult];
        } else {
          // Multiple NFTs
          const mintParams = Array.from({ length: quantity }, () => ({
            carName: item.name,
            imageUrl: item.imageUrl || '',
            projectUrl: metadata.projectUrl || 'https://blastwheelz.io',
            rim: metadata.rim || 'Standard Alloy Rims',
            texture: metadata.texture || 'Standard Texture',
            speed: metadata.speed || 'Standard Speed',
            brake: metadata.brake || 'Standard Brakes',
            control: metadata.control || 'Standard Control',
            ownerAddress: user.walletAddress,
          }));

          const results = await mintMultipleNFTs(mintParams, user.walletAddress);
          
          // Store all successfully minted NFTs in database
          for (const mintResult of results) {
            if (mintResult.success && mintResult.nftObjectId) {
              await prisma.nFT.create({
                data: {
                  tokenId: mintResult.nftObjectId,
                  suiObjectId: mintResult.nftObjectId,
                  name: item.name,
                  description: item.description,
                  imageUrl: item.imageUrl,
                  ownerAddress: user.walletAddress,
                  creator: user.walletAddress,
                  metadata: {
                    purchaseId: result.purchase.id,
                    kioskId: mintResult.kioskId,
                    kioskOwnerCapId: mintResult.kioskOwnerCapId,
                    transactionDigest: mintResult.transactionDigest,
                  },
                },
              });
              console.log(`✅ NFT minted and stored: ${mintResult.nftObjectId}`);
            }
          }
          mintResults = results;
        }
      } catch (mintError: any) {
        // Log error but don't fail the purchase - user already paid
        console.error('❌ Error minting NFT on-chain (purchase still successful):', mintError);
        // Store error in purchase metadata for manual review
        await prisma.marketplacePurchase.update({
          where: { id: result.purchase.id },
          data: {
            metadata: {
              ...(result.purchase.metadata && typeof result.purchase.metadata === 'object' ? result.purchase.metadata : {}),
              mintError: mintError.message,
            },
          },
        });
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
      nfts: item.type === 'NFT' ? mintResults.map(r => ({
        success: r.success,
        nftObjectId: r.nftObjectId,
        kioskId: r.kioskId,
        kioskOwnerCapId: r.kioskOwnerCapId,
        transactionDigest: r.transactionDigest,
        error: r.error,
      })) : undefined,
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

