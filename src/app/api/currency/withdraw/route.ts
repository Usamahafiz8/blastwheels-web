import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { suiClient, SUI_CONFIG } from '@/lib/sui';
import { getTreasuryKeypair } from '@/lib/treasury';
import { Transaction } from '@mysten/sui/transactions';

/**
 * @swagger
 * /api/currency/withdraw:
 *   post:
 *     summary: Withdraw/exchange blastwheelz back to Sui tokens (blastweel token)
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
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of blastwheelz to withdraw (1:1 conversion to WHEELS tokens)
 *     responses:
 *       200:
 *         description: Withdrawal successful
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
 *         description: Invalid request or insufficient balance
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { amount } = body;

    // Validate input
    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number' },
        { status: 400 }
      );
    }

    // Get current user balance
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { blastwheelzBalance: true, walletAddress: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentBalance = parseFloat(currentUser.blastwheelzBalance.toString());
    if (currentBalance < withdrawAmount) {
      return NextResponse.json(
        { error: 'Insufficient blastwheelz balance' },
        { status: 400 }
      );
    }

    // Check if user already has a pending withdrawal request
    const pendingWithdrawal = await prisma.transaction.findFirst({
      where: {
        userId: user.id,
        type: 'WITHDRAWAL',
        status: 'PENDING',
      },
    });

    if (pendingWithdrawal) {
      return NextResponse.json(
        { error: 'You already have a pending withdrawal request. Please wait for admin approval or cancel the existing request.' },
        { status: 400 }
      );
    }

    const userWalletAddress = currentUser.walletAddress;
    if (!userWalletAddress || !userWalletAddress.startsWith('0x')) {
      return NextResponse.json(
        { error: 'User wallet address is not set or invalid' },
        { status: 400 }
      );
    }

    // Deduct balance and create pending withdrawal request atomically
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from user balance immediately
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          blastwheelzBalance: {
            decrement: withdrawAmount,
          },
        },
        select: {
          id: true,
          username: true,
          walletAddress: true,
          blastwheelzBalance: true,
        },
      });

      // Create pending withdrawal request (admin approval required)
      const withdrawalRequest = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'WITHDRAWAL',
          amount: withdrawAmount.toString(),
          status: 'PENDING',
          metadata: {
            currencyType: 'blastwheelz',
            conversionRate: 1,
            targetToken: 'WHEELS',
            withdrawalType: 'TREASURY_WITHDRAWAL',
            walletAddress: userWalletAddress,
            requestedAt: new Date().toISOString(),
            balanceDeducted: true, // Flag to indicate balance was already deducted
          },
        },
      });

      return { withdrawalRequest, updatedUser };
    });

    return NextResponse.json({
      message: 'Withdrawal request submitted. Waiting for admin approval. Your balance has been deducted and will be returned if rejected.',
      request: {
        id: result.withdrawalRequest.id,
        amount: result.withdrawalRequest.amount.toString(),
        status: result.withdrawalRequest.status,
        createdAt: result.withdrawalRequest.createdAt,
      },
      newBalance: result.updatedUser.blastwheelzBalance.toString(),
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

