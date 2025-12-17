import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
 *         description: User details
 *       404:
 *         description: User not found
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req);
    const userId = params.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        walletAddress: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        playerStats: {
          select: {
            totalGames: true,
            wins: true,
            losses: true,
            totalEarnings: true,
            totalSpent: true,
            rank: true,
            level: true,
            experience: true,
          },
        },
        _count: {
          select: {
            gameSessions: true,
            transactions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (own profile or admin)
 *     tags: [Users]
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
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               walletAddress:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, PLAYER]
 *                 description: Only admins can change role
 *               isActive:
 *                 type: boolean
 *                 description: Only admins can change isActive
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Forbidden - insufficient permissions
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth(req);
    const userId = params.id;
    const body = await req.json();
    const { username, email, password, walletAddress, role, isActive } = body;

    // Check if user is updating their own profile or is admin
    const isOwnProfile = currentUser.id === userId;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isOwnProfile && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only update your own profile' },
        { status: 403 }
      );
    }

    // Only admins can change role and isActive
    if ((role !== undefined || isActive !== undefined) && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can change role or active status' },
        { status: 403 }
      );
    }

    const updateData: any = {};

    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email || null;
    if (walletAddress !== undefined) {
      // Validate wallet address format
      if (walletAddress && (!walletAddress.startsWith('0x') || walletAddress.length < 20)) {
        return NextResponse.json(
          { error: 'Invalid wallet address format' },
          { status: 400 }
        );
      }
      updateData.walletAddress = walletAddress;
    }
    if (password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    if (role !== undefined && isAdmin) updateData.role = role;
    if (isActive !== undefined && isAdmin) updateData.isActive = isActive;

    // Check if username or email already exists (excluding current user)
    if (username || email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                ...(username ? [{ username }] : []),
                ...(email ? [{ email }] : []),
              ],
            },
          ],
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username or email already exists' },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        walletAddress: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (own account or admin)
 *     tags: [Users]
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
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden - insufficient permissions
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await requireAuth(req);
    const userId = params.id;

    // Check if user is deleting their own account or is admin
    const isOwnAccount = currentUser.id === userId;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isOwnAccount && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only delete your own account' },
        { status: 403 }
      );
    }

    // Prevent admins from deleting themselves
    if (isOwnAccount && isAdmin) {
      return NextResponse.json(
        { error: 'Admins cannot delete their own account. Contact another admin.' },
        { status: 403 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

