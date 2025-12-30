import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/marketplace/items:
 *   get:
 *     summary: Browse marketplace items (public)
 *     tags: [Marketplace]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SOLD_OUT]
 *         description: "Filter by status (default: ACTIVE)"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by item type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or description
 *     responses:
 *       200:
 *         description: List of active marketplace items
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || 'ACTIVE';
    const type = searchParams.get('type') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;

    const where: any = {
      status: status as any,
    };

    if (type) where.type = type;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.marketplaceItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        status: true,
        type: true,
        stock: true,
        category: true,
        soldCount: true,
        createdAt: true,
        // Don't expose metadata or createdBy to public
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('List marketplace items error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

