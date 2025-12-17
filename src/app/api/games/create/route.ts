import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/games/create:
 *   post:
 *     summary: Create a new game session
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entryFee
 *             properties:
 *               entryFee:
 *                 type: number
 *                 description: Entry fee in WHEELS tokens
 *     responses:
 *       201:
 *         description: Game session created
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { entryFee } = body;

    if (!entryFee || entryFee <= 0) {
      return NextResponse.json(
        { error: 'Valid entry fee is required' },
        { status: 400 }
      );
    }

    const gameSession = await prisma.gameSession.create({
      data: {
        userId: user.id,
        entryFee: entryFee.toString(),
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      {
        message: 'Game session created',
        gameSession,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

