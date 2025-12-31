import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/users/game-history:
 *   get:
 *     summary: Get current user's game history
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Paginated game history
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      prisma.gameSession.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.gameSession.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get game history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

