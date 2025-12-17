import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        playerStats: {
          select: {
            totalGames: true,
            wins: true,
            losses: true,
            totalEarnings: true,
            totalSpent: true,
            rank: true,
            level: true,
            experience: true,
          },
        },
      },
    });

    if (!fullUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: fullUser });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get me error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

