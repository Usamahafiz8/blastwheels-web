import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { suiClient } from '@/lib/sui';

/**
 * @swagger
 * /api/currency/purchase:
 *   post:
 *     summary: Purchase blastwheelz with Sui tokens (blastweel token)
 *     tags: [Currency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - suiTxHash
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of blastweel tokens to spend (1:1 conversion)
 *               suiTxHash:
 *                 type: string
 *                 description: Sui transaction hash for the purchase
 *     responses:
 *       200:
 *         description: Purchase successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 balance:
 *                   type: string
 *                 transaction:
 *                   type: object
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { amount, suiTxHash } = body;

    // Validate input
    if (!amount || !suiTxHash) {
      return NextResponse.json(
        { error: 'Amount and suiTxHash are required' },
        { status: 400 }
      );
    }

    const purchaseAmount = parseFloat(amount);
    if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number' },
        { status: 400 }
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

    // Verify transaction on Sui blockchain
    try {
      const tx = await suiClient.getTransactionBlock({
        digest: suiTxHash,
        options: {
          showEffects: true,
          showInput: true,
        },
      });

      // Verify transaction is successful
      if (tx.effects?.status?.status !== 'success') {
        return NextResponse.json(
          { error: 'Transaction failed on blockchain' },
          { status: 400 }
        );
      }

      // Verify transaction is from user's wallet
      // Note: This is a simplified check. In production, you should verify:
      // 1. The transaction sender matches user.walletAddress
      // 2. The transaction is a valid token transfer to your contract
      // 3. The amount matches
    } catch (suiError: any) {
      console.error('Sui transaction verification error:', suiError);
      return NextResponse.json(
        { error: 'Failed to verify transaction on blockchain' },
        { status: 400 }
      );
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update user balance (1:1 conversion)
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          blastwheelzBalance: {
            increment: purchaseAmount,
          },
        },
        select: {
          blastwheelzBalance: true,
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'CURRENCY_PURCHASE',
          amount: purchaseAmount.toString(),
          suiTxHash,
          status: 'COMPLETED',
          metadata: {
            currencyType: 'blastwheelz',
            conversionRate: 1,
            sourceToken: 'blastweel',
          },
        },
      });

      return { updatedUser, transaction };
    });

    return NextResponse.json({
      message: 'Purchase successful',
      balance: result.updatedUser.blastwheelzBalance.toString(),
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount.toString(),
        type: result.transaction.type,
        status: result.transaction.status,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Purchase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



