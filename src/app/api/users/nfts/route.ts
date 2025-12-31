import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/users/nfts:
 *   get:
 *     summary: Get all purchased NFTs owned by the current user with full details
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
 *           default: 20
 *         description: Number of results per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by NFT name, tokenId, or suiObjectId
 *     responses:
 *       200:
 *         description: List of user's NFTs with purchase details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 nfts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       tokenId:
 *                         type: string
 *                       suiObjectId:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       imageUrl:
 *                         type: string
 *                       projectUrl:
 *                         type: string
 *                       ownerAddress:
 *                         type: string
 *                       collectionId:
 *                         type: string
 *                       mintNumber:
 *                         type: integer
 *                       alloyRim:
 *                         type: string
 *                       frontBonnet:
 *                         type: string
 *                       backBonnet:
 *                         type: string
 *                       creator:
 *                         type: string
 *                       metadata:
 *                         type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       purchaseDetails:
 *                         type: object
 *                         properties:
 *                           purchaseId:
 *                             type: string
 *                           purchasePrice:
 *                             type: string
 *                           purchaseDate:
 *                             type: string
 *                             format: date-time
 *                           itemName:
 *                             type: string
 *                           transactionHash:
 *                             type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || undefined;

    // Build where clause for NFTs owned by user
    const where: any = {
      ownerAddress: user.walletAddress,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tokenId: { contains: search, mode: 'insensitive' } },
        { suiObjectId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get NFTs owned by user
    const [nfts, total] = await Promise.all([
      prisma.nFT.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.nFT.count({ where }),
    ]);

    // Extract purchase IDs from NFT metadata
    const purchaseIds = nfts
      .map((nft) => {
        const metadata = nft.metadata as any;
        return metadata?.purchaseId;
      })
      .filter((id): id is string => !!id);

    // Batch fetch all purchases
    const purchases = purchaseIds.length > 0
      ? await prisma.marketplacePurchase.findMany({
          where: { id: { in: purchaseIds } },
          include: {
            item: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                type: true,
              },
            },
          },
        })
      : [];

    // Create a map for quick lookup
    const purchaseMap = new Map(purchases.map((p) => [p.id, p]));

    // Batch fetch transactions for purchases
    // Note: Prisma JSON filtering is limited, so we fetch all relevant transactions and filter in code
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

    // Create transaction map by purchaseId
    const transactionMap = new Map<string, typeof purchaseTransactions[0]>();
    purchaseTransactions.forEach((tx) => {
      const txMetadata = tx.metadata as any;
      const txPurchaseId = txMetadata?.purchaseId;
      if (txPurchaseId && !transactionMap.has(txPurchaseId)) {
        transactionMap.set(txPurchaseId, tx);
      }
    });

    // Get transactions for NFTs without purchaseId (direct NFT purchases)
    // Fetch all relevant transactions and filter in code due to Prisma JSON limitations
    const directTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: { in: ['NFT_PURCHASE', 'MARKETPLACE_PURCHASE'] },
      },
      orderBy: { createdAt: 'desc' },
    }).then((txs) => {
      const nftIds = new Set(nfts.map((nft) => nft.id));
      const nftTokenIds = new Set(nfts.map((nft) => nft.tokenId));
      const nftSuiObjectIds = new Set(nfts.map((nft) => nft.suiObjectId));

      return txs.filter((tx) => {
        const txMetadata = tx.metadata as any;
        // Skip if this transaction is already linked to a purchaseId
        if (purchaseIds.includes(txMetadata?.purchaseId)) return false;
        // Check if this transaction is for any of our NFTs
        return (
          nftIds.has(txMetadata?.nftId) ||
          nftTokenIds.has(txMetadata?.nftTokenId) ||
          nftSuiObjectIds.has(txMetadata?.nftSuiObjectId)
        );
      });
    });

    // Create maps for direct transactions
    const directTxByNftId = new Map<string, typeof directTransactions[0]>();
    const directTxByTokenId = new Map<string, typeof directTransactions[0]>();
    const directTxBySuiObjectId = new Map<string, typeof directTransactions[0]>();

    directTransactions.forEach((tx) => {
      const txMetadata = tx.metadata as any;
      if (txMetadata?.nftId) directTxByNftId.set(txMetadata.nftId, tx);
      if (txMetadata?.nftTokenId) directTxByTokenId.set(txMetadata.nftTokenId, tx);
      if (txMetadata?.nftSuiObjectId) directTxBySuiObjectId.set(txMetadata.nftSuiObjectId, tx);
    });

    // Combine NFT data with purchase details
    const nftsWithPurchaseDetails = nfts.map((nft) => {
      let purchaseDetails = null;

      // Try to find purchase details from metadata
      const metadata = nft.metadata as any;
      const purchaseId = metadata?.purchaseId;

      if (purchaseId) {
        const purchase = purchaseMap.get(purchaseId);
        if (purchase) {
          const transaction = transactionMap.get(purchaseId);
          purchaseDetails = {
            purchaseId: purchase.id,
            purchasePrice: purchase.price.toString(),
            purchaseDate: purchase.createdAt,
            itemName: purchase.item.name,
            itemImageUrl: purchase.item.imageUrl,
            quantity: purchase.quantity,
            transactionHash: transaction?.suiTxHash || null,
            transactionStatus: transaction?.status || null,
          };
        }
      } else {
        // Try to find direct transaction
        const transaction =
          directTxByNftId.get(nft.id) ||
          directTxByTokenId.get(nft.tokenId) ||
          directTxBySuiObjectId.get(nft.suiObjectId);

        if (transaction) {
          const txMetadata = transaction.metadata as any;
          purchaseDetails = {
            purchaseId: null,
            purchasePrice: transaction.amount.toString(),
            purchaseDate: transaction.createdAt,
            itemName: txMetadata?.nftName || txMetadata?.itemName || nft.name,
            itemImageUrl: null,
            quantity: txMetadata?.quantity || 1,
            transactionHash: transaction.suiTxHash,
            transactionStatus: transaction.status,
          };
        }
      }

      return {
        ...nft,
        purchaseDetails,
      };
    });

    return NextResponse.json({
      nfts: nftsWithPurchaseDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get user NFTs error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

