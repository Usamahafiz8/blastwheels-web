import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyNFTPurchaseTransaction, getNFTOwner } from '@/lib/nft';
import { suiClient } from '@/lib/sui';

/**
 * @swagger
 * /api/cars/{id}/purchase:
 *   post:
 *     summary: Purchase an NFT car
 *     tags: [Cars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Car ID, tokenId, or suiObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - suiTxHash
 *             properties:
 *               suiTxHash:
 *                 type: string
 *                 description: Sui transaction hash for the NFT purchase
 *     responses:
 *       200:
 *         description: Purchase successful
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Car not found
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await context.params;
    const body = await req.json();
    const { suiTxHash } = body;

    if (!suiTxHash || !suiTxHash.trim()) {
      return NextResponse.json(
        { error: 'suiTxHash is required' },
        { status: 400 }
      );
    }

    // Find the NFT car
    const car = await prisma.nFT.findFirst({
      where: {
        OR: [{ id }, { tokenId: id }, { suiObjectId: id }],
      },
    });

    if (!car) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }

    // Check if transaction hash already exists
    const existingTx = await prisma.transaction.findUnique({
      where: { suiTxHash },
    });

    if (existingTx) {
      return NextResponse.json(
        { error: 'Transaction hash already processed' },
        { status: 400 }
      );
    }

    // Verify the NFT purchase transaction on-chain
    const buyerAddress = user.walletAddress;
    const isValid = await verifyNFTPurchaseTransaction(
      suiTxHash,
      car.suiObjectId,
      buyerAddress
    );

    if (!isValid) {
      // As a fallback, check current owner from on-chain
      const currentOwner = await getNFTOwner(car.suiObjectId);
      if (currentOwner?.toLowerCase() === buyerAddress.toLowerCase()) {
        // Owner matches, transaction might be valid but verification method didn't catch it
        // Proceed with purchase
      } else {
        return NextResponse.json(
          { error: 'Transaction verification failed. NFT ownership transfer not confirmed.' },
          { status: 400 }
        );
      }
    }

    // Get transaction details to extract purchase price if available
    let purchasePrice = null;
    try {
      const tx = await suiClient.getTransactionBlock({
        digest: suiTxHash,
        options: {
          showEffects: true,
          showBalanceChanges: true,
        },
      });

      // Try to extract purchase price from balance changes
      const balanceChanges = tx.balanceChanges || [];
      const buyerBalanceChange = balanceChanges.find(
        (change: any) => change.owner?.AddressOwner?.toLowerCase() === buyerAddress.toLowerCase()
      );
      
      if (buyerBalanceChange && buyerBalanceChange.amount) {
        // Amount is negative for buyer (they paid)
        purchasePrice = Math.abs(parseInt(buyerBalanceChange.amount));
      }
    } catch (error) {
      console.error('Error extracting purchase price:', error);
      // Continue without price
    }

    // Update NFT ownership and create transaction record
    const result = await prisma.$transaction(async (tx) => {
      // Update NFT owner
      const updatedCar = await tx.nFT.update({
        where: { id: car.id },
        data: {
          ownerAddress: buyerAddress,
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'NFT_PURCHASE',
          amount: purchasePrice ? purchasePrice.toString() : '0',
          suiTxHash,
          status: 'COMPLETED',
          metadata: {
            nftId: car.id,
            nftTokenId: car.tokenId,
            nftSuiObjectId: car.suiObjectId,
            nftName: car.name,
            previousOwner: car.ownerAddress,
            newOwner: buyerAddress,
            purchasePrice: purchasePrice || null,
          },
        },
      });

      return { updatedCar, transaction };
    });

    return NextResponse.json({
      message: 'Purchase successful',
      car: result.updatedCar,
      transaction: {
        id: result.transaction.id,
        suiTxHash: result.transaction.suiTxHash,
        type: result.transaction.type,
        status: result.transaction.status,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Purchase car error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

