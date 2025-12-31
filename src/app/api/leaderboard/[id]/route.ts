import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * @swagger
 * /api/leaderboard/{id}:
 *   get:
 *     summary: Get a specific leaderboard entry
 *     tags: [Leaderboard]
 *     security: []  # No authentication required
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leaderboard entry
 *       404:
 *         description: Entry not found
 *   put:
 *     summary: Update a leaderboard entry
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               position:
 *                 type: integer
 *               score:
 *                 type: number
 *               earnings:
 *                 type: number
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Leaderboard entry updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Entry not found
 *   delete:
 *     summary: Delete a leaderboard entry
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leaderboard entry deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Entry not found
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const entry = await prisma.leaderboardEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            walletAddress: true,
          },
        },
        gameSession: {
          select: {
            id: true,
            status: true,
            gameType: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Leaderboard entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error('Get leaderboard entry error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await requireAuth(req);
    const body = await req.json();
    const { position, score, earnings, metadata } = body;

    // Check if entry exists and belongs to user or user is admin
    const entry = await prisma.leaderboardEntry.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Leaderboard entry not found' },
        { status: 404 }
      );
    }

    // Only allow user to update their own entries, or admin to update any
    if (entry.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own entries' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (position !== undefined) updateData.position = position;
    if (score !== undefined) updateData.score = score.toString();
    if (earnings !== undefined) updateData.earnings = earnings.toString();
    if (metadata !== undefined) updateData.metadata = metadata;

    const updated = await prisma.leaderboardEntry.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
      message: 'Leaderboard entry updated',
      entry: updated,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update leaderboard entry error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await requireAuth(req);

    // Check if entry exists
    const entry = await prisma.leaderboardEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Leaderboard entry not found' },
        { status: 404 }
      );
    }

    // Only allow user to delete their own entries, or admin to delete any
    if (entry.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own entries' },
        { status: 403 }
      );
    }

    await prisma.leaderboardEntry.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Leaderboard entry deleted',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete leaderboard entry error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

