import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with pagination (admin only)
 *     tags: [Admin]
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
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, PLAYER]
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, 'ADMIN');
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const role = searchParams.get('role') || undefined;

    const where = role
      ? {
          role: role as any, // ADMIN or PLAYER
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          walletAddress: true,
          role: true,
          isActive: true,
          createdAt: true,
          playerStats: {
            select: {
              totalGames: true,
              wins: true,
              losses: true,
              totalEarnings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

