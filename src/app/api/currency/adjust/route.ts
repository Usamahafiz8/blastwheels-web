import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/currency/adjust:
 *   post:
 *     summary: Add or subtract in-game currency (blastwheelz) for authenticated user
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
 *                 type: number
 *                 description: "Amount to add (positive) or subtract (negative). Example: 100 to add, -50 to subtract"
 *               reason:
 *                 type: string
 *                 description: Optional reason for the adjustment
 *     responses:
 *       200:
 *         description: Balance adjusted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 balance:
 *                   type: string
 *                 previousBalance:
 *                   type: string
 *                 adjustment:
 *                   type: number
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
    const { amount, reason } = body as {
      amount?: number;
      reason?: string;
    };

    // Validate amount
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);

    if (numericAmount === 0) {
      return NextResponse.json(
        { error: 'Amount cannot be zero' },
        { status: 400 }
      );
    }

    // Get current user balance
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, blastwheelzBalance: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const previousBalance = Number(currentUser.blastwheelzBalance);
    const newBalance = previousBalance + numericAmount;

    // Prevent negative balance
    if (newBalance < 0) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          currentBalance: previousBalance,
          requestedAdjustment: numericAmount,
          wouldResultIn: newBalance,
        },
        { status: 400 }
      );
    }

    // Update balance and create transaction record atomically
    const result = await prisma.$transaction(async (tx) => {
      // Update user balance
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          blastwheelzBalance: newBalance,
        },
        select: {
          id: true,
          blastwheelzBalance: true,
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: numericAmount > 0 ? 'DEPOSIT' : 'WITHDRAWAL',
          amount: Math.abs(numericAmount).toString(),
          status: 'COMPLETED',
          metadata: {
            reason: reason || 'Manual adjustment',
            adjustmentType: numericAmount > 0 ? 'ADD' : 'SUBTRACT',
            previousBalance: previousBalance.toString(),
            newBalance: newBalance.toString(),
          },
        },
      });

      return { updatedUser, transaction };
    });

    return NextResponse.json({
      message: numericAmount > 0 
        ? `Successfully added ${numericAmount} blastwheelz`
        : `Successfully subtracted ${Math.abs(numericAmount)} blastwheelz`,
      balance: result.updatedUser.blastwheelzBalance.toString(),
      previousBalance: previousBalance.toString(),
      adjustment: numericAmount,
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: result.transaction.amount.toString(),
        status: result.transaction.status,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Adjust balance error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}



