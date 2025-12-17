import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, 'ADMIN');
    
    const [
      totalUsers,
      activeUsers,
      totalGames,
      completedGames,
      totalTransactions,
      totalVolume,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.gameSession.count(),
      prisma.gameSession.count({ where: { status: 'COMPLETED' } }),
      prisma.transaction.count(),
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        totalGames,
        completedGames,
        totalTransactions,
        totalVolume: totalVolume._sum.amount || 0,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Get platform stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

