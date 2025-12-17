import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const stats = await prisma.playerStats.findUnique({
      where: { userId: user.id },
    });

    if (!stats) {
      return NextResponse.json(
        { error: 'Stats not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ stats });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

