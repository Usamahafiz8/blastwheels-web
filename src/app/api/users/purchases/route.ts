import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/users/purchases:
 *   get:
 *     summary: Get user's marketplace purchases
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of user's purchases
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const purchases = await prisma.marketplacePurchase.findMany({
      where: {
        userId: user.id,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            price: true,
            type: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({
      purchases: purchases.map((p) => ({
        id: p.id,
        item: {
          id: p.item.id,
          name: p.item.name,
          imageUrl: p.item.imageUrl,
          price: p.item.price.toString(),
          type: p.item.type,
          category: p.item.category,
        },
        quantity: p.quantity,
        price: p.price.toString(),
        createdAt: p.createdAt,
      })),
      total: purchases.length,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get purchases error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

