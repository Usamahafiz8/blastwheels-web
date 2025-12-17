import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/users/leaderboard:
 *   get:
 *     summary: Get leaderboard
 *     tags: [Users]
 *     security: []  # No authentication required
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top players to return
 *     responses:
 *       200:
 *         description: Leaderboard data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    const leaderboard = await prisma.playerStats.findMany({
      take: limit,
      orderBy: [
        { rank: 'asc' },
        { totalEarnings: 'desc' },
      ],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            walletAddress: true,
          },
        },
      },
    });

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

