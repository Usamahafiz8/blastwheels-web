import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { generateToken } from '@/lib/jwt';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     security: []  # No authentication required
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               walletAddress:
 *                 type: string
 *                 description: Sui wallet address (optional - will generate placeholder if not provided)
 *               username:
 *                 type: string
 *                 description: Unique username (required)
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 description: Optional password for email-based auth
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, username, email, password } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // If wallet address is provided, validate it
    // Otherwise, generate a unique placeholder address (user can add wallet later)
    let finalWalletAddress = walletAddress;
    const isPlaceholder = !walletAddress || walletAddress === '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    if (isPlaceholder) {
      // Generate a unique placeholder address for users without wallet
      // Format: 0x + 64 hex characters (same format as Sui addresses)
      finalWalletAddress = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    } else {
      // Validate Sui address format if provided
      if (!walletAddress.startsWith('0x') || walletAddress.length < 20) {
        return NextResponse.json(
          { error: 'Invalid wallet address format' },
          { status: 400 }
        );
      }
    }

    // Check if user already exists
    // Only check wallet address if it's not a placeholder
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(!isPlaceholder ? [{ walletAddress: finalWalletAddress }] : []),
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this wallet, username, or email' },
        { status: 400 }
      );
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Welcome bonus amount (500 blastwheelz)
    const welcomeBonus = 500;

    // Create user with welcome bonus and create player stats in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user with initial balance
      const user = await tx.user.create({
      data: {
        walletAddress: finalWalletAddress,
        username,
        email: email || null,
        passwordHash,
        role: 'PLAYER',
          blastwheelzBalance: welcomeBonus.toString(), // Give new users 500 currency as welcome bonus
      },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Create player stats
      await tx.playerStats.create({
      data: {
        userId: user.id,
      },
    });

      // Create transaction record for welcome bonus
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          amount: welcomeBonus.toString(),
          status: 'COMPLETED',
          metadata: {
            reason: 'Welcome bonus for new user registration',
            type: 'WELCOME_BONUS',
          },
        },
      });

      return user;
    });

    const user = result;

    // Generate token
    const token = generateToken({
      userId: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
    });

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user,
        token,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return NextResponse.json(
        { error: `User already exists with this ${field}` },
        { status: 400 }
      );
    }
    
    // Handle other Prisma errors
    if (error.code?.startsWith('P')) {
      return NextResponse.json(
        { error: 'Database error during registration', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

