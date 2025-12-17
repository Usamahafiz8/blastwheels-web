import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const gameId = params.id;
    const body = await req.json();
    const { position, earnings, transactionId } = body;

    const gameSession = await prisma.gameSession.findFirst({
      where: {
        id: gameId,
        userId: user.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    if (!gameSession) {
      return NextResponse.json(
        { error: 'Game session not found or already completed' },
        { status: 404 }
      );
    }

    // Update game session
    const updatedSession = await prisma.gameSession.update({
      where: { id: gameId },
      data: {
        status: 'COMPLETED',
        position: position || null,
        earnings: earnings ? earnings.toString() : '0',
        transactionId: transactionId || null,
        completedAt: new Date(),
      },
    });

    // Update player stats
    const stats = await prisma.playerStats.findUnique({
      where: { userId: user.id },
    });

    if (stats) {
      const isWin = position === 1;
      await prisma.playerStats.update({
        where: { userId: user.id },
        data: {
          totalGames: { increment: 1 },
          wins: isWin ? { increment: 1 } : undefined,
          losses: !isWin ? { increment: 1 } : undefined,
          totalEarnings: { increment: earnings || 0 },
          totalSpent: { increment: gameSession.entryFee },
        },
      });
    }

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'GAME_REWARD',
        amount: earnings ? earnings.toString() : '0',
        suiTxHash: transactionId || null,
        status: 'COMPLETED',
        metadata: {
          gameSessionId: gameId,
          position,
        },
      },
    });

    return NextResponse.json({
      message: 'Game session completed',
      gameSession: updatedSession,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Complete game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

