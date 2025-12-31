import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/users/inventory:
 *   get:
 *     summary: Get complete user inventory with all details (for dashboard)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [NFT, ITEM, UPGRADE, CURRENCY, ALL]
 *           default: ALL
 *         description: Filter by item type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, tokenId, or description
 *     responses:
 *       200:
 *         description: Complete inventory with all details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inventory:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [NFT, ITEM, UPGRADE, CURRENCY]
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       imageUrl:
 *                         type: string
 *                       nftDetails:
 *                         type: object
 *                         description: NFT-specific details (only for NFT type)
 *                       purchaseInfo:
 *                         type: object
 *                         description: Purchase information
 *                       transactionInfo:
 *                         type: object
 *                         description: Blockchain transaction details
 *                       metadata:
 *                         type: object
 *                       acquiredAt:
 *                         type: string
 *                         format: date-time
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalNFTs:
 *                       type: integer
 *                     totalValue:
 *                       type: string
 *                     byType:
 *                       type: object
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const skip = (page - 1) * limit;
    const typeFilter = searchParams.get('type') || 'ALL';
    const search = searchParams.get('search') || undefined;

    // Get all purchases for the user
    const allPurchases = await prisma.marketplacePurchase.findMany({
      where: { userId: user.id },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            type: true,
            category: true,
            metadata: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all NFTs owned by the user (don't filter by search here, we'll filter later)
    const nftWhere: any = {
      ownerAddress: user.walletAddress,
    };

    const allNFTs = await prisma.nFT.findMany({
      where: nftWhere,
      orderBy: { createdAt: 'desc' },
    });

    // Get all transactions for purchases
    const purchaseIds = allPurchases.map((p) => p.id);
    const purchaseTransactions = purchaseIds.length > 0
      ? await prisma.transaction.findMany({
          where: {
            userId: user.id,
            type: { in: ['MARKETPLACE_PURCHASE', 'NFT_PURCHASE'] },
          },
          orderBy: { createdAt: 'desc' },
        }).then((txs) =>
          txs.filter((tx) => {
            const txMetadata = tx.metadata as any;
            return purchaseIds.includes(txMetadata?.purchaseId);
          })
        )
      : [];

    // Create transaction map
    const transactionMap = new Map<string, typeof purchaseTransactions[0]>();
    purchaseTransactions.forEach((tx) => {
      const txMetadata = tx.metadata as any;
      const txPurchaseId = txMetadata?.purchaseId;
      if (txPurchaseId && !transactionMap.has(txPurchaseId)) {
        transactionMap.set(txPurchaseId, tx);
      }
    });

    // Build inventory items from purchases
    const inventoryItems: any[] = [];

    // Track which NFTs have been added to inventory
    const addedNFTIds = new Set<string>();

    // Process NFT purchases - link to actual NFTs
    for (const purchase of allPurchases) {
      if (purchase.item.type === 'NFT') {
        // Find NFTs linked to this purchase
        // Check both string and UUID format for purchaseId
        const linkedNFTs = allNFTs.filter((nft) => {
          const nftMetadata = nft.metadata as any;
          if (!nftMetadata) return false;
          
          const nftPurchaseId = nftMetadata.purchaseId;
          if (!nftPurchaseId) return false;
          
          // Match by exact string or UUID comparison
          const matches = (
            nftPurchaseId === purchase.id ||
            String(nftPurchaseId) === String(purchase.id) ||
            nftPurchaseId.toString() === purchase.id.toString()
          );
          
          return matches;
        });
        
        // Debug logging (can be removed in production)
        if (process.env.NODE_ENV === 'development') {
          console.log(`Purchase ${purchase.id}: Found ${linkedNFTs.length} linked NFTs out of ${purchase.quantity} purchased`);
        }

        const transaction = transactionMap.get(purchase.id);
        const purchaseMetadata = purchase.metadata as any;

        if (linkedNFTs.length > 0) {
          // Create inventory item for each linked NFT
          for (const nft of linkedNFTs) {
            addedNFTIds.add(nft.id);
            const nftMetadata = nft.metadata as any;

            inventoryItems.push({
              id: nft.id,
              type: 'NFT',
              name: nft.name || purchase.item.name,
              description: nft.description || purchase.item.description,
              imageUrl: nft.imageUrl || purchase.item.imageUrl,
              nftDetails: {
                tokenId: nft.tokenId,
                suiObjectId: nft.suiObjectId,
                collectionId: nft.collectionId,
                mintNumber: nft.mintNumber,
                alloyRim: nft.alloyRim,
                frontBonnet: nft.frontBonnet,
                backBonnet: nft.backBonnet,
                creator: nft.creator,
                kioskId: nftMetadata?.kioskId,
                kioskOwnerCapId: nftMetadata?.kioskOwnerCapId,
                transactionDigest: nftMetadata?.transactionDigest,
              },
              purchaseInfo: {
                purchaseId: purchase.id,
                purchasePrice: purchase.price.toString(),
                purchaseDate: purchase.createdAt,
                quantity: purchase.quantity,
                itemName: purchase.item.name,
                itemCategory: purchase.item.category,
              },
              transactionInfo: transaction
                ? {
                    transactionHash: transaction.suiTxHash,
                    transactionStatus: transaction.status,
                    transactionDate: transaction.createdAt,
                    paymentMethod: (transaction.metadata as any)?.paymentMethod || 'crypto_wallet',
                  }
                : null,
              metadata: {
                ...nftMetadata,
                itemMetadata: purchase.item.metadata,
              },
              acquiredAt: nft.createdAt || purchase.createdAt,
            });
          }

          // If purchase quantity > linked NFTs, show remaining as pending
          if (linkedNFTs.length < purchase.quantity) {
            const remaining = purchase.quantity - linkedNFTs.length;
            for (let i = 0; i < remaining; i++) {
              inventoryItems.push({
                id: `purchase-${purchase.id}-pending-${i}`,
                type: 'NFT',
                name: purchase.item.name,
                description: purchase.item.description,
                imageUrl: purchase.item.imageUrl,
                nftDetails: null,
                purchaseInfo: {
                  purchaseId: purchase.id,
                  purchasePrice: purchase.price.toString(),
                  purchaseDate: purchase.createdAt,
                  quantity: 1,
                  itemName: purchase.item.name,
                  itemCategory: purchase.item.category,
                },
                transactionInfo: transaction
                  ? {
                      transactionHash: transaction.suiTxHash,
                      transactionStatus: transaction.status,
                      transactionDate: transaction.createdAt,
                      paymentMethod: (transaction.metadata as any)?.paymentMethod || 'crypto_wallet',
                    }
                  : null,
                metadata: {
                  purchaseId: purchase.id,
                  mintStatus: 'pending',
                  mintError: purchaseMetadata?.mintError,
                  itemMetadata: purchase.item.metadata,
                },
                acquiredAt: purchase.createdAt,
              });
            }
          }
        } else {
          // Purchase exists but no NFTs linked yet - show as pending
          // Create one entry per quantity
          for (let i = 0; i < purchase.quantity; i++) {
            inventoryItems.push({
              id: `purchase-${purchase.id}-pending-${i}`,
              type: 'NFT',
              name: purchase.item.name,
              description: purchase.item.description,
              imageUrl: purchase.item.imageUrl,
              nftDetails: null,
              purchaseInfo: {
                purchaseId: purchase.id,
                purchasePrice: purchase.price.toString(),
                purchaseDate: purchase.createdAt,
                quantity: 1,
                itemName: purchase.item.name,
                itemCategory: purchase.item.category,
              },
              transactionInfo: transaction
                ? {
                    transactionHash: transaction.suiTxHash,
                    transactionStatus: transaction.status,
                    transactionDate: transaction.createdAt,
                    paymentMethod: (transaction.metadata as any)?.paymentMethod || 'crypto_wallet',
                  }
                : null,
              metadata: {
                purchaseId: purchase.id,
                mintStatus: 'pending',
                mintError: purchaseMetadata?.mintError,
                itemMetadata: purchase.item.metadata,
              },
              acquiredAt: purchase.createdAt,
            });
          }
        }
      } else {
        // Non-NFT items (ITEM, UPGRADE, CURRENCY, etc.)
        const transaction = transactionMap.get(purchase.id);
        inventoryItems.push({
          id: `purchase-${purchase.id}`,
          type: purchase.item.type,
          name: purchase.item.name,
          description: purchase.item.description,
          imageUrl: purchase.item.imageUrl,
          nftDetails: null,
          purchaseInfo: {
            purchaseId: purchase.id,
            purchasePrice: purchase.price.toString(),
            purchaseDate: purchase.createdAt,
            quantity: purchase.quantity,
            itemName: purchase.item.name,
            itemCategory: purchase.item.category,
          },
          transactionInfo: transaction
            ? {
                transactionHash: transaction.suiTxHash,
                transactionStatus: transaction.status,
                transactionDate: transaction.createdAt,
                paymentMethod: (transaction.metadata as any)?.paymentMethod || 'database_balance',
              }
            : null,
          metadata: {
            purchaseId: purchase.id,
            itemMetadata: purchase.item.metadata,
            purchaseMetadata: purchase.metadata,
          },
          acquiredAt: purchase.createdAt,
        });
      }
    }

    // Get all NFT-related transactions for direct transfers
    const allNFTTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: { in: ['NFT_PURCHASE', 'MARKETPLACE_PURCHASE'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create maps for NFT transactions
    const nftTxById = new Map<string, typeof allNFTTransactions[0]>();
    const nftTxByTokenId = new Map<string, typeof allNFTTransactions[0]>();
    const nftTxBySuiObjectId = new Map<string, typeof allNFTTransactions[0]>();

    allNFTTransactions.forEach((tx) => {
      const txMetadata = tx.metadata as any;
      // Skip if already linked to a purchase
      if (txMetadata?.purchaseId && purchaseIds.includes(txMetadata.purchaseId)) return;

      if (txMetadata?.nftId) nftTxById.set(txMetadata.nftId, tx);
      if (txMetadata?.nftTokenId) nftTxByTokenId.set(txMetadata.nftTokenId, tx);
      if (txMetadata?.nftSuiObjectId) nftTxBySuiObjectId.set(txMetadata.nftSuiObjectId, tx);
    });

    // Add NFTs that weren't purchased through marketplace (direct transfers, etc.)
    for (const nft of allNFTs) {
      // Skip if already added via purchase
      if (addedNFTIds.has(nft.id)) {
        continue;
      }

      const nftMetadata = nft.metadata as any;
      const purchaseId = nftMetadata?.purchaseId;

      // Skip if linked to a purchase we already processed
      if (purchaseId && purchaseIds.includes(purchaseId)) {
        continue;
      }

      // Find transaction for this NFT
      const nftTransaction =
        nftTxById.get(nft.id) ||
        nftTxByTokenId.get(nft.tokenId) ||
        nftTxBySuiObjectId.get(nft.suiObjectId);

      inventoryItems.push({
        id: nft.id,
        type: 'NFT',
        name: nft.name,
        description: nft.description,
        imageUrl: nft.imageUrl,
        nftDetails: {
          tokenId: nft.tokenId,
          suiObjectId: nft.suiObjectId,
          collectionId: nft.collectionId,
          mintNumber: nft.mintNumber,
          alloyRim: nft.alloyRim,
          frontBonnet: nft.frontBonnet,
          backBonnet: nft.backBonnet,
          creator: nft.creator,
          kioskId: nftMetadata?.kioskId,
          kioskOwnerCapId: nftMetadata?.kioskOwnerCapId,
          transactionDigest: nftMetadata?.transactionDigest,
        },
        purchaseInfo: nftTransaction
          ? {
              purchaseId: null,
              purchasePrice: nftTransaction.amount.toString(),
              purchaseDate: nftTransaction.createdAt,
              quantity: 1,
              itemName: (nftTransaction.metadata as any)?.nftName || nft.name,
              itemCategory: null,
            }
          : null,
        transactionInfo: nftTransaction
          ? {
              transactionHash: nftTransaction.suiTxHash,
              transactionStatus: nftTransaction.status,
              transactionDate: nftTransaction.createdAt,
              paymentMethod: (nftTransaction.metadata as any)?.paymentMethod || 'crypto_wallet',
            }
          : null,
        metadata: nftMetadata,
        acquiredAt: nft.createdAt,
      });
    }

    // Apply type filter
    let filteredItems = inventoryItems;
    if (typeFilter !== 'ALL') {
      filteredItems = inventoryItems.filter((item) => item.type === typeFilter);
    }

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.name?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.nftDetails?.tokenId?.toLowerCase().includes(searchLower) ||
          item.nftDetails?.suiObjectId?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by acquired date (newest first)
    filteredItems.sort((a, b) => {
      const dateA = new Date(a.acquiredAt).getTime();
      const dateB = new Date(b.acquiredAt).getTime();
      return dateB - dateA;
    });

    // Calculate summary statistics
    const summary = {
      totalItems: filteredItems.length,
      totalNFTs: filteredItems.filter((item) => item.type === 'NFT').length,
      totalValue: filteredItems
        .reduce((sum, item) => {
          const price = item.purchaseInfo?.purchasePrice
            ? parseFloat(item.purchaseInfo.purchasePrice)
            : 0;
          return sum + price;
        }, 0)
        .toFixed(8),
      byType: {
        NFT: filteredItems.filter((item) => item.type === 'NFT').length,
        ITEM: filteredItems.filter((item) => item.type === 'ITEM').length,
        UPGRADE: filteredItems.filter((item) => item.type === 'UPGRADE').length,
        CURRENCY: filteredItems.filter((item) => item.type === 'CURRENCY').length,
        OTHER: filteredItems.filter((item) => item.type === 'OTHER').length,
      },
    };

    // Apply pagination
    const paginatedItems = filteredItems.slice(skip, skip + limit);

    return NextResponse.json({
      inventory: paginatedItems,
      summary,
      pagination: {
        page,
        limit,
        total: filteredItems.length,
        totalPages: Math.ceil(filteredItems.length / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get user inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

