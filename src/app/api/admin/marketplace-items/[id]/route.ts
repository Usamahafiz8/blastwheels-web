import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/admin/marketplace-items/{id}:
 *   get:
 *     summary: Get marketplace item by ID (admin only)
 *     tags: [Admin, Marketplace]
 *     security:
 *       - bearerAuth: []
 *   put:
 *     summary: Update marketplace item (admin only)
 *     tags: [Admin, Marketplace]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Delete marketplace item (admin only)
 *     tags: [Admin, Marketplace]
 *     security:
 *       - bearerAuth: []
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(req, 'ADMIN');
    const { id } = await context.params;

    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Get marketplace item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(req, 'ADMIN');
    const { id } = await context.params;
    const body = await req.json();
    const {
      name,
      description,
      imageUrl,
      price,
      status,
      type,
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

    const existingItem = await prisma.marketplaceItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
    if (price !== undefined) {
      if (isNaN(Number(price)) || Number(price) < 0) {
        return NextResponse.json(
          { error: 'Invalid price' },
          { status: 400 }
        );
      }
      updateData.price = Number(price);
    }
    if (status !== undefined) updateData.status = status;
    if (type !== undefined) updateData.type = type;
    if (stock !== undefined) updateData.stock = stock !== null ? stock : null;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (metadata !== undefined) updateData.metadata = metadata;

    // Auto-update status to SOLD_OUT if stock reaches 0
    if (updateData.stock === 0) {
      updateData.status = 'SOLD_OUT';
    }

    const item = await prisma.marketplaceItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ message: 'Item updated', item });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Update marketplace item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(req, 'ADMIN');
    const { id } = await context.params;

    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    await prisma.marketplaceItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Item deleted' });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Delete marketplace item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

