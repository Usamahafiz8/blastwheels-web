import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/users/inventory/debug:
 *   get:
 *     summary: Debug endpoint to check purchase and NFT linking
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Debug information about purchases and NFTs
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    // Get all purchases
    const purchases = await prisma.marketplacePurchase.findMany({
      where: { userId: user.id },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all NFTs
    const nfts = await prisma.nFT.findMany({
      where: { ownerAddress: user.walletAddress },
      select: {
        id: true,
        tokenId: true,
        name: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Check linking
    const debugInfo = purchases.map((purchase) => {
      const linkedNFTs = nfts.filter((nft) => {
        const nftMetadata = nft.metadata as any;
        const nftPurchaseId = nftMetadata?.purchaseId;
        return (
          nftPurchaseId &&
          (nftPurchaseId === purchase.id ||
            String(nftPurchaseId) === String(purchase.id))
        );
      });

      return {
        purchase: {
          id: purchase.id,
          itemName: purchase.item.name,
          itemType: purchase.item.type,
          quantity: purchase.quantity,
          purchaseDate: purchase.createdAt,
        },
        linkedNFTs: linkedNFTs.length,
        linkedNFTDetails: linkedNFTs.map((nft) => ({
          id: nft.id,
          tokenId: nft.tokenId,
          name: nft.name,
          purchaseIdInMetadata: (nft.metadata as any)?.purchaseId,
        })),
        status:
          purchase.item.type === 'NFT'
            ? linkedNFTs.length === purchase.quantity
              ? 'complete'
              : linkedNFTs.length > 0
              ? 'partial'
              : 'pending'
            : 'non-nft',
      };
    });

    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
      },
      summary: {
        totalPurchases: purchases.length,
        nftPurchases: purchases.filter((p) => p.item.type === 'NFT').length,
        totalNFTs: nfts.length,
      },
      purchases: debugInfo,
      allNFTs: nfts.map((nft) => ({
        id: nft.id,
        tokenId: nft.tokenId,
        name: nft.name,
        purchaseIdInMetadata: (nft.metadata as any)?.purchaseId,
        createdAt: nft.createdAt,
      })),
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Debug inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

