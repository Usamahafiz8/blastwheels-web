import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/admin/withdrawals:
 *   get:
 *     summary: Get all pending withdrawal requests (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending withdrawals
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, 'ADMIN');
    
    const pendingWithdrawals = await prisma.transaction.findMany({
      where: {
        type: 'WITHDRAWAL',
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            walletAddress: true,
            blastwheelzBalance: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({
      withdrawals: pendingWithdrawals.map((w) => ({
        id: w.id,
        userId: w.userId,
        username: w.user.username,
        email: w.user.email,
        walletAddress: w.user.walletAddress,
        amount: w.amount.toString(),
        currentBalance: w.user.blastwheelzBalance.toString(),
        metadata: w.metadata,
        createdAt: w.createdAt,
      })),
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Get withdrawals error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

