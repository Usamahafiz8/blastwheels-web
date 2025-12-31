import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GameType } from '@prisma/client';

/**
 * @swagger
 * /api/leaderboard/game/{gameId}:
 *   get:
 *     summary: Get leaderboard for a specific game
 *     tags: [Leaderboard]
 *     security: []  # No authentication required
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: gameType
 *         schema:
 *           type: string
 *           enum: [REGULAR, FRIENDS, ONE_VS_ONE]
 *         description: Filter by game type
 *     responses:
 *       200:
 *         description: Leaderboard for the game
 *       404:
 *         description: Game not found
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await context.params;
    const { searchParams } = new URL(req.url);
    const gameType = searchParams.get('gameType') as GameType | null;

    const where: any = {
      gameId,
    };

    if (gameType) {
      where.gameType = gameType;
    }

    const entries = await prisma.leaderboardEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            walletAddress: true,
          },
        },
      },
      orderBy: [
        { position: 'asc' },
        { score: 'desc' },
      ],
    });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No leaderboard entries found for this game' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      gameId,
      gameType: entries[0].gameType,
      entries,
      totalPlayers: entries.length,
    });
  } catch (error: any) {
    console.error('Get game leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

