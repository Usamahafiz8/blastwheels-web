import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyPurchaseTransaction, getTreasuryAddress } from '@/lib/treasury';
import { SUI_CONFIG } from '@/lib/sui';

/**
 * @swagger
 * /api/currency/purchase-auto:
 *   post:
 *     summary: Purchase blastwheelz with automatic token transfer to treasury
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
 *               - walletAddress
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of blastweel tokens to spend (1:1 conversion)
 *               walletAddress:
 *                 type: string
 *                 description: User's wallet address
 *               txHash:
 *                 type: string
 *                 description: Transaction hash (if transaction already executed)
 *     responses:
 *       200:
 *         description: Purchase successful or transaction ready to sign
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
    const { amount, walletAddress, txHash } = body;

    // Validate input
    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required' },
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

    // Enforce that the wallet used on-chain matches the wallet saved in DB
    if (walletAddress && walletAddress !== user.walletAddress) {
      return NextResponse.json(
        {
          error: 'Wallet mismatch',
          message: 'Please connect the wallet linked to your account',
        },
        { status: 400 }
      );
    }

    const effectiveWalletAddress = user.walletAddress;

    // Convert amount to smallest unit (assuming 9 decimals like WHEELS)
    const amountInSmallestUnit = BigInt(Math.floor(purchaseAmount * 1_000_000_000));

    // If transaction hash is provided, verify and process
    if (txHash) {
      // Check if transaction hash already exists
      const existingTx = await prisma.transaction.findUnique({
        where: { suiTxHash: txHash },
      });

      if (existingTx) {
        return NextResponse.json(
          { error: 'Transaction hash already processed' },
          { status: 400 }
        );
      }

      // Verify transaction
      const isValid = await verifyPurchaseTransaction(
        txHash,
        amountInSmallestUnit,
        effectiveWalletAddress
      );

      if (!isValid) {
        return NextResponse.json(
          { error: 'Transaction verification failed' },
          { status: 400 }
        );
      }

      // Process the purchase
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
            suiTxHash: txHash,
            status: 'COMPLETED',
            metadata: {
              currencyType: 'blastwheelz',
              conversionRate: 1,
              sourceToken: 'blastweel',
              method: 'auto-transfer',
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
    } else {
      // Return transaction details for frontend to build and sign
      const treasuryAddress = getTreasuryAddress();
      if (!treasuryAddress) {
        return NextResponse.json(
          { error: 'Treasury wallet not configured' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Transaction details',
        treasuryAddress,
        amount: purchaseAmount.toString(),
        amountInSmallestUnit: amountInSmallestUnit.toString(),
        coinType: SUI_CONFIG.coinType, // Use WHEELS tokens for purchase
        instructions: 'Build a transaction to transfer tokens to treasury, sign it, execute it, then call this endpoint again with the txHash',
      });
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Purchase auto error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

