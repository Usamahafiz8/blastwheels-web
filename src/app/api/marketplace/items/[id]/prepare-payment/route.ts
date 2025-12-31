import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTreasuryAddress } from '@/lib/treasury';

/**
 * @swagger
 * /api/marketplace/items/{id}/prepare-payment:
 *   post:
 *     summary: Prepare payment transaction for NFT purchase (authenticated)
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
 *         description: Payment transaction prepared
 *       400:
 *         description: Invalid request
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
    const { quantity = 1 } = body as { quantity?: number };

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    // Get item
    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
    });

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

    // Only NFT items require crypto wallet payment
    if (item.type !== 'NFT') {
      return NextResponse.json(
        { error: 'This endpoint is only for NFT purchases. Use the regular purchase endpoint for other items.' },
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

    // Get treasury address
    const treasuryAddress = getTreasuryAddress();
    if (!treasuryAddress) {
      return NextResponse.json(
        { error: 'Treasury address not configured' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      message: 'Payment details prepared',
      payment: {
        amount: totalPrice.toString(),
        amountInSmallestUnit: totalPriceInSmallestUnit.toString(),
        itemName: item.name,
        quantity,
        treasuryAddress,
        userWalletAddress: user.walletAddress,
      },
      instructions: {
        step1: 'Use createPurchaseTransaction from @/lib/treasury to build the payment transaction',
        step2: 'Sign and execute the transaction with your wallet',
        step3: 'Call the purchase endpoint with the transaction hash',
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Prepare payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

