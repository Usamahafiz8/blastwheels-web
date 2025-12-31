import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GameType } from '@prisma/client';

/**
 * @swagger
 * /api/leaderboard/stats:
 *   get:
 *     summary: Get leaderboard statistics
 *     tags: [Leaderboard]
 *     security: []  # No authentication required
 *     parameters:
 *       - in: query
 *         name: gameType
 *         schema:
 *           type: string
 *           enum: [REGULAR, FRIENDS, ONE_VS_ONE]
 *         description: Filter by game type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Get stats for specific user
 *     responses:
 *       200:
 *         description: Leaderboard statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameType = searchParams.get('gameType') as GameType | null;
    const userId = searchParams.get('userId');

    const where: any = {};
    if (gameType) {
      where.gameType = gameType;
    }
    if (userId) {
      where.userId = userId;
    }

    const [
      totalEntries,
      totalGames,
      topPlayers,
      averageScore,
      totalEarnings,
    ] = await Promise.all([
      // Total entries
      prisma.leaderboardEntry.count({ where }),
      
      // Total unique games
      prisma.leaderboardEntry.groupBy({
        by: ['gameId'],
        where: {
          ...where,
          gameId: { not: null },
        },
      }).then((result) => result.length),
      
      // Top 10 players by wins (position = 1)
      prisma.leaderboardEntry.groupBy({
        by: ['userId'],
        where: {
          ...where,
          position: 1,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      }).then(async (wins) => {
        const userIds = wins.map((w) => w.userId);
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, walletAddress: true },
        });
        return wins.map((win) => ({
          userId: win.userId,
          wins: win._count.id,
          user: users.find((u) => u.id === win.userId),
        }));
      }),
      
      // Average score
      prisma.leaderboardEntry.aggregate({
        where,
        _avg: {
          score: true,
        },
      }).then((result) => Number(result._avg.score || 0)),
      
      // Total earnings
      prisma.leaderboardEntry.aggregate({
        where,
        _sum: {
          earnings: true,
        },
      }).then((result) => Number(result._sum.earnings || 0)),
    ]);

    // Get user-specific stats if userId provided
    let userStats = null;
    if (userId) {
      const [userWins, userTotalGames, userBestScore, userTotalEarnings] = await Promise.all([
        prisma.leaderboardEntry.count({
          where: { ...where, userId, position: 1 },
        }),
        prisma.leaderboardEntry.count({
          where: { ...where, userId },
        }),
        prisma.leaderboardEntry.findFirst({
          where: { ...where, userId },
          orderBy: { score: 'desc' },
          select: { score: true, position: true },
        }),
        prisma.leaderboardEntry.aggregate({
          where: { ...where, userId },
          _sum: { earnings: true },
        }).then((result) => Number(result._sum.earnings || 0)),
      ]);

      userStats = {
        wins: userWins,
        totalGames: userTotalGames,
        losses: userTotalGames - userWins,
        winRate: userTotalGames > 0 ? (userWins / userTotalGames) * 100 : 0,
        bestScore: userBestScore ? Number(userBestScore.score) : 0,
        bestPosition: userBestScore?.position || null,
        totalEarnings: userTotalEarnings,
      };
    }

    return NextResponse.json({
      stats: {
        totalEntries,
        totalGames,
        averageScore,
        totalEarnings,
        topPlayers,
      },
      userStats,
    });
  } catch (error: any) {
    console.error('Get leaderboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

