import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/games/active:
 *   get:
 *     summary: Get active game sessions
 *     tags: [Games]
 *     security: []  # No authentication required
 *     responses:
 *       200:
 *         description: List of active games
 */
export async function GET() {
  try {
    const activeGames = await prisma.gameSession.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ games: activeGames });
  } catch (error) {
    console.error('Get active games error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

