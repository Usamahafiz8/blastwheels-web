import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/currency/history:
 *   get:
 *     summary: Get user's currency purchase history
 *     tags: [Currency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of transactions to skip
 *     responses:
 *       200:
 *         description: Transaction history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          type: 'CURRENCY_PURCHASE',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          amount: true,
          suiTxHash: true,
          status: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.transaction.count({
        where: {
          userId: user.id,
          type: 'CURRENCY_PURCHASE',
        },
      }),
    ]);

    return NextResponse.json({
      transactions: transactions.map((tx) => ({
        ...tx,
        amount: tx.amount.toString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

