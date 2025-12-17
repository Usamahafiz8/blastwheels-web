import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        playerStats: true,
        gameSessions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            gameSessions: true,
            transactions: true,
          },
        },
      },
    });

    if (!fullUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: fullUser });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

