import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
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



