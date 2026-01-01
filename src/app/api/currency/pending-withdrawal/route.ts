import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/currency/pending-withdrawal:
 *   get:
 *     summary: Get user's pending withdrawal request
 *     tags: [Currency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending withdrawal request if exists
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const pendingWithdrawal = await prisma.transaction.findFirst({
      where: {
        userId: user.id,
        type: 'WITHDRAWAL',
        status: 'PENDING',
      },
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (pendingWithdrawal) {
      return NextResponse.json({
        withdrawal: {
          ...pendingWithdrawal,
          amount: pendingWithdrawal.amount.toString(),
        },
      });
    }

    return NextResponse.json({
      withdrawal: null,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get pending withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

