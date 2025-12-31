import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GameType } from '@prisma/client';

/**
 * @swagger
 * /api/leaderboard:
 *   get:
 *     summary: Get leaderboard entries
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
 *         name: gameId
 *         schema:
 *           type: string
 *         description: Filter by specific game ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [position, score, createdAt]
 *           default: position
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: Leaderboard entries
 *   post:
 *     summary: Create a new leaderboard entry
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gameType
 *               - position
 *               - score
 *               - entryFee
 *             properties:
 *               gameType:
 *                 type: string
 *                 enum: [REGULAR, FRIENDS, ONE_VS_ONE]
 *               gameId:
 *                 type: string
 *               gameSessionId:
 *                 type: string
 *               position:
 *                 type: integer
 *               score:
 *                 type: number
 *               earnings:
 *                 type: number
 *               entryFee:
 *                 type: number
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Leaderboard entry created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameType = searchParams.get('gameType') as GameType | null;
    const gameId = searchParams.get('gameId');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const sortBy = searchParams.get('sortBy') || 'position';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const skip = (page - 1) * limit;

    const where: any = {};
    if (gameType) {
      where.gameType = gameType;
    }
    if (gameId) {
      where.gameId = gameId;
    }
    if (userId) {
      where.userId = userId;
    }

    const orderBy: any = {};
    if (sortBy === 'position') {
      orderBy.position = sortOrder;
    } else if (sortBy === 'score') {
      orderBy.score = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [entries, total] = await Promise.all([
      prisma.leaderboardEntry.findMany({
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
        orderBy,
        skip,
        take: limit,
      }),
      prisma.leaderboardEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gameType,
      gameId,
      gameSessionId,
      position,
      score,
      earnings = 0,
      entryFee,
      metadata,
    } = body;

    // Validate required fields
    if (!gameType || !['REGULAR', 'FRIENDS', 'ONE_VS_ONE'].includes(gameType)) {
      return NextResponse.json(
        { error: 'Valid gameType is required (REGULAR, FRIENDS, ONE_VS_ONE)' },
        { status: 400 }
      );
    }

    if (position === undefined || position === null) {
      return NextResponse.json(
        { error: 'Position is required' },
        { status: 400 }
      );
    }

    if (score === undefined || score === null) {
      return NextResponse.json(
        { error: 'Score is required' },
        { status: 400 }
      );
    }

    if (!entryFee || entryFee < 0) {
      return NextResponse.json(
        { error: 'Valid entryFee is required' },
        { status: 400 }
      );
    }

    // Get user from auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = await import('@/lib/jwt');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, walletAddress: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if entry already exists for this game
    if (gameId) {
      const existing = await prisma.leaderboardEntry.findFirst({
        where: {
          gameType: gameType as GameType,
          gameId,
          userId: user.id,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Leaderboard entry already exists for this game' },
          { status: 400 }
        );
      }
    }

    // Create leaderboard entry
    const entry = await prisma.leaderboardEntry.create({
      data: {
        gameType: gameType as GameType,
        gameId: gameId || null,
        gameSessionId: gameSessionId || null,
        userId: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
        position,
        score: score.toString(),
        earnings: earnings.toString(),
        entryFee: entryFee.toString(),
        metadata: metadata || {},
      },
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

    return NextResponse.json(
      {
        message: 'Leaderboard entry created',
        entry,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Leaderboard entry already exists for this game' },
        { status: 400 }
      );
    }
    console.error('Create leaderboard entry error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

