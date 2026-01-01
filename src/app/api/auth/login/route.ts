import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { generateToken } from '@/lib/jwt';

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with wallet address or email/password
 *     tags: [Authentication]
 *     security: []  # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             oneOf:
 *               - required: [walletAddress]
 *                 properties:
 *                   walletAddress:
 *                     type: string
 *               - required: [email, password]
 *                 properties:
 *                   email:
 *                     type: string
 *                   password:
 *                     type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, email, password } = body;

    let user;

    if (walletAddress) {
      // Wallet-based login
      user = await prisma.user.findUnique({
        where: { walletAddress },
        select: {
          id: true,
          walletAddress: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
        },
      });
    } else if (email && password) {
      // Email/password login
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          walletAddress: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          passwordHash: true,
        },
      });

      if (user && user.passwordHash) {
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Either walletAddress or email/password is required' },
        { status: 400 }
      );
    }

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid credentials or user inactive' },
        { status: 401 }
      );
    }

    // Check if user has received welcome bonus
    const welcomeBonus = 500;
    // Get all DEPOSIT transactions for this user
    const depositTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'DEPOSIT',
      },
      select: {
        metadata: true,
      },
    });

    // Check if any transaction has WELCOME_BONUS in metadata
    const hasWelcomeBonus = depositTransactions.some((tx) => {
      if (!tx.metadata || typeof tx.metadata !== 'object') return false;
      const metadata = tx.metadata as any;
      return metadata.type === 'WELCOME_BONUS';
    });

    // Give welcome bonus on first login if not already received
    if (!hasWelcomeBonus) {
      try {
        await prisma.$transaction(async (tx) => {
          // Get current balance
          const currentUser = await tx.user.findUnique({
            where: { id: user.id },
            select: { blastwheelzBalance: true },
          });

          if (currentUser) {
            const currentBalance = Number(currentUser.blastwheelzBalance);
            const newBalance = currentBalance + welcomeBonus;

            // Update balance
            await tx.user.update({
              where: { id: user.id },
              data: {
                blastwheelzBalance: newBalance.toString(),
              },
            });

            // Create transaction record
            await tx.transaction.create({
              data: {
                userId: user.id,
                type: 'DEPOSIT',
                amount: welcomeBonus.toString(),
                status: 'COMPLETED',
                metadata: {
                  reason: 'Welcome bonus for joining the platform',
                  type: 'WELCOME_BONUS',
                },
              },
            });
          }
        });
      } catch (error) {
        // Log error but don't fail login if bonus fails
        console.error('Failed to give welcome bonus on login:', error);
      }
    }

    const token = generateToken({
      userId: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
    });

    return NextResponse.json({
      message: hasWelcomeBonus ? 'Login successful' : 'Login successful! You received 500 blastwheelz as a joining bonus!',
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
      welcomeBonusReceived: !hasWelcomeBonus,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

