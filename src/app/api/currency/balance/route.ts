import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/currency/balance:
 *   get:
 *     summary: Get user's blastwheelz balance
 *     tags: [Currency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's blastwheelz balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: string
 *                   description: Current blastwheelz balance
 *                 userId:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: "Admin: set or adjust a user's blastwheelz balance"
 *     tags: [Currency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Target user ID (defaults to current user if admin omits)
 *               amount:
 *                 type: number
 *                 description: Amount to set/adjust
 *               operation:
 *                 type: string
 *                 enum: [set, increment, decrement]
 *                 default: set
 *     responses:
 *       200:
 *         description: Updated balance
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const userWithBalance = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        blastwheelzBalance: true,
        username: true,
      },
    });

    if (!userWithBalance) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      balance: userWithBalance.blastwheelzBalance.toString(),
      userId: userWithBalance.id,
      username: userWithBalance.username,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get balance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only admins can modify balances directly
    const admin = await requireRole(req, 'ADMIN');
    const body = await req.json();
    const {
      userId,
      amount,
      operation = 'set',
    } = body as {
      userId?: string;
      amount?: number;
      operation?: 'set' | 'increment' | 'decrement';
    };

    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    const targetUserId = userId || admin.id;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, blastwheelzBalance: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let data;
    const numericAmount = Number(amount);

    if (operation === 'increment') {
      if (numericAmount <= 0) {
        return NextResponse.json(
          { error: 'Increment amount must be positive' },
          { status: 400 }
        );
      }
      data = { blastwheelzBalance: { increment: numericAmount } };
    } else if (operation === 'decrement') {
      if (numericAmount <= 0) {
        return NextResponse.json(
          { error: 'Decrement amount must be positive' },
          { status: 400 }
        );
      }
      data = { blastwheelzBalance: { decrement: numericAmount } };
    } else {
      if (numericAmount < 0) {
        return NextResponse.json(
          { error: 'Balance cannot be negative' },
          { status: 400 }
        );
      }
      data = { blastwheelzBalance: numericAmount };
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data,
      select: {
        id: true,
        blastwheelzBalance: true,
      },
    });

    return NextResponse.json({
      message: 'Balance updated',
      userId: updated.id,
      balance: updated.blastwheelzBalance.toString(),
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Update balance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



