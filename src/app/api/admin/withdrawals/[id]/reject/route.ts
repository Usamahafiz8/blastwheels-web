import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/admin/withdrawals/{id}/reject:
 *   post:
 *     summary: Reject a withdrawal request (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Optional reason for rejection
 *     responses:
 *       200:
 *         description: Withdrawal rejected
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const admin = await requireRole(req, 'ADMIN');
    const body = await req.json();
    const { reason } = body as { reason?: string };

    // Get the withdrawal request
    const withdrawalRequest = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!withdrawalRequest) {
      return NextResponse.json(
        { error: 'Withdrawal request not found' },
        { status: 404 }
      );
    }

    if (withdrawalRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Withdrawal request is already ${withdrawalRequest.status}` },
        { status: 400 }
      );
    }

    const metadata = withdrawalRequest.metadata as any || {};
    const balanceAlreadyDeducted = metadata.balanceDeducted === true;
    const withdrawAmount = parseFloat(withdrawalRequest.amount.toString());

    // Return balance to user and update transaction to rejected atomically
    const result = await prisma.$transaction(async (tx) => {
      // Return balance if it was deducted when request was created
      let updatedUser;
      if (balanceAlreadyDeducted) {
        updatedUser = await tx.user.update({
          where: { id: withdrawalRequest.userId },
          data: {
            blastwheelzBalance: {
              increment: withdrawAmount,
            },
          },
          select: {
            id: true,
            username: true,
            blastwheelzBalance: true,
          },
        });
      } else {
        // Fetch user for response (balance wasn't deducted, so no need to return)
        updatedUser = await tx.user.findUnique({
          where: { id: withdrawalRequest.userId },
          select: {
            id: true,
            username: true,
            blastwheelzBalance: true,
          },
        });
      }

      // Update transaction to rejected
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: {
          status: 'FAILED',
          metadata: {
            ...metadata,
            rejectionReason: reason || 'Rejected by admin',
            rejectedAt: new Date().toISOString(),
            rejectedBy: admin.id,
            balanceReturned: balanceAlreadyDeducted, // Flag to indicate if balance was returned
          },
        },
      });

      return { updatedTransaction, updatedUser };
    });

    return NextResponse.json({
      message: balanceAlreadyDeducted 
        ? 'Withdrawal request rejected. Balance has been returned to user account.'
        : 'Withdrawal request rejected',
      transaction: {
        id: result.updatedTransaction.id,
        status: result.updatedTransaction.status,
      },
      user: result.updatedUser ? {
        id: result.updatedUser.id,
        username: result.updatedUser.username,
        newBalance: result.updatedUser.blastwheelzBalance.toString(),
      } : undefined,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Reject withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

