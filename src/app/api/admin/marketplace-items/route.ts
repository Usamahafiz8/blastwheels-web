import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/admin/marketplace-items:
 *   get:
 *     summary: List all marketplace items (admin only)
 *     tags: [Admin, Marketplace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SOLD_OUT]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of marketplace items
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, 'ADMIN');
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') as any;
    const type = searchParams.get('type') as any;
    const category = searchParams.get('category') || undefined;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (category) where.category = category;

    const items = await prisma.marketplaceItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('List marketplace items error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/admin/marketplace-items:
 *   post:
 *     summary: Create a new marketplace item (admin only)
 *     tags: [Admin, Marketplace]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               price:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, SOLD_OUT]
 *               type:
 *                 type: string
 *                 enum: [NFT, ITEM, UPGRADE, CURRENCY, OTHER]
 *               stock:
 *                 type: integer
 *               category:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Item created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole(req, 'ADMIN');
    const body = await req.json();
    const {
      name,
      description,
      imageUrl,
      price,
      status = 'ACTIVE',
      type = 'ITEM',
      stock,
      category,
      metadata,
    } = body as {
      name?: string;
      description?: string;
      imageUrl?: string;
      price?: number;
      status?: 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT';
      type?: 'NFT' | 'ITEM' | 'UPGRADE' | 'CURRENCY' | 'OTHER';
      stock?: number;
      category?: string;
      metadata?: Record<string, any>;
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      );
    }

    const item = await prisma.marketplaceItem.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        price: Number(price),
        status,
        type,
        stock: stock !== undefined ? stock : null,
        category: category?.trim() || null,
        metadata: metadata || null,
        createdBy: admin.id,
      },
    });

    return NextResponse.json(
      { message: 'Marketplace item created', item },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    
    // Handle connection errors gracefully
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || error.message === 'aborted') {
      console.error('Database connection error:', error.code || error.message);
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 503 }
      );
    }
    
    console.error('Create marketplace item error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

