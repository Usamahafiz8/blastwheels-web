import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/marketplace/items/{id}/purchase:
 *   post:
 *     summary: Purchase a marketplace item (authenticated)
 *     tags: [Marketplace]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Purchase successful
 *       400:
 *         description: Invalid request (insufficient balance, out of stock, etc.)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    const { id } = await context.params;
    const body = await req.json();
    const { quantity = 1 } = body as { quantity?: number };

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    // Get item with current user balance
    const [item, userWithBalance] = await Promise.all([
      prisma.marketplaceItem.findUnique({
        where: { id },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { blastwheelzBalance: true },
      }),
    ]);

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (item.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Item is not available for purchase' },
        { status: 400 }
      );
    }

    // Check stock
    if (item.stock !== null && item.stock < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock available' },
        { status: 400 }
      );
    }

    // Calculate total price
    const totalPrice = Number(item.price) * quantity;

    // Check user balance
    const userBalance = Number(userWithBalance?.blastwheelzBalance || 0);
    if (userBalance < totalPrice) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          required: totalPrice,
          available: userBalance,
        },
        { status: 400 }
      );
    }

    // Process purchase in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct balance
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          blastwheelzBalance: {
            decrement: totalPrice,
          },
        },
        select: {
          blastwheelzBalance: true,
        },
      });

      // Update item stock and sold count
      const updateData: any = {
        soldCount: { increment: quantity },
      };
      if (item.stock !== null) {
        updateData.stock = { decrement: quantity };
        // Auto-update status if stock reaches 0
        if (item.stock - quantity === 0) {
          updateData.status = 'SOLD_OUT';
        }
      }

      const updatedItem = await tx.marketplaceItem.update({
        where: { id },
        data: updateData,
      });

      // Create purchase record
      const purchase = await tx.marketplacePurchase.create({
        data: {
          itemId: id,
          userId: user.id,
          price: item.price,
          quantity,
          metadata: {
            itemName: item.name,
            itemType: item.type,
            totalPrice,
          },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'MARKETPLACE_PURCHASE',
          amount: totalPrice.toString(),
          status: 'COMPLETED',
          metadata: {
            itemId: id,
            itemName: item.name,
            purchaseId: purchase.id,
            quantity,
          },
        },
      });

      return { updatedUser, updatedItem, purchase };
    });

    return NextResponse.json({
      message: 'Purchase successful',
      purchase: {
        id: result.purchase.id,
        itemName: item.name,
        quantity,
        totalPrice,
        remainingBalance: result.updatedUser.blastwheelzBalance.toString(),
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Purchase marketplace item error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

