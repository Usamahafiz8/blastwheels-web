import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/marketplace/items/{id}:
 *   get:
 *     summary: Get marketplace item details (public)
 *     tags: [Marketplace]
 *     responses:
 *       200:
 *         description: Item details
 *       404:
 *         description: Item not found
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
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

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Get marketplace item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

