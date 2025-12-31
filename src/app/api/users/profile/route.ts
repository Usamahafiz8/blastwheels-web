import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile with stats and recent game sessions
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *   put:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *               email:
 *                 type: string
 *                 format: email
 *               walletAddress:
 *                 type: string
 *                 description: Sui wallet address (must start with 0x)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input or username/email already exists
 *       401:
 *         description: Unauthorized
 */
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

export async function PUT(req: NextRequest) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json();
    const { username, email, walletAddress } = body as {
      username?: string;
      email?: string;
      walletAddress?: string;
    };

    const updateData: any = {};

    if (username !== undefined) {
      if (!username.trim() || username.length < 3) {
        return NextResponse.json(
          { error: 'Username must be at least 3 characters' },
          { status: 400 }
        );
      }
      updateData.username = username.trim();
    }

    if (email !== undefined) {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
      updateData.email = email || null;
    }

    if (walletAddress !== undefined) {
      if (!walletAddress.startsWith('0x') || walletAddress.length < 10) {
        return NextResponse.json(
          { error: 'Invalid wallet address format' },
          { status: 400 }
        );
      }
      updateData.walletAddress = walletAddress;
    }

    // Ensure uniqueness constraints manually for username/email/walletAddress when changed
    if (updateData.username || updateData.email || updateData.walletAddress) {
      const conflicts = await prisma.user.findFirst({
        where: {
          id: { not: authUser.id },
          OR: [
            ...(updateData.username ? [{ username: updateData.username }] : []),
            ...(updateData.email ? [{ email: updateData.email }] : []),
            ...(updateData.walletAddress ? [{ walletAddress: updateData.walletAddress }] : []),
          ],
        },
        select: { id: true },
      });

      if (conflicts) {
        return NextResponse.json(
          { error: 'Username, email, or wallet address already in use' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        walletAddress: true,
        role: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

