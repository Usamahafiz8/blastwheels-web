import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { suiClient } from '@/lib/sui';

/**
 * @swagger
 * /api/sui/native-balance:
 *   get:
 *     summary: Get user's native SUI token balance
 *     tags: [Sui]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's native SUI balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletAddress:
 *                   type: string
 *                 balance:
 *                   type: string
 *                   description: Balance in MIST (1 SUI = 1,000,000,000 MIST)
 *                 balanceSui:
 *                   type: string
 *                   description: Balance in SUI
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    // Use provided wallet address or fall back to user's stored wallet address
    const walletAddress = searchParams.get('walletAddress') || user.walletAddress;

    // Validate wallet address format (Sui addresses start with 0x and are typically 66 chars, but can vary)
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Invalid wallet address format. Must start with 0x' },
        { status: 400 }
      );
    }

    // Check if it's a placeholder address
    if (walletAddress === '0x0000000000000000000000000000000000000000000000000000000000000000' || 
        walletAddress.length < 10) {
      return NextResponse.json(
        { error: 'Please connect a valid Sui wallet address' },
        { status: 400 }
      );
    }

    // Get native SUI balance
    const balance = await suiClient.getBalance({
      owner: walletAddress,
    });

    return NextResponse.json({
      walletAddress,
      balance: balance.totalBalance,
      balanceSui: (parseInt(balance.totalBalance) / 1_000_000_000).toString(),
      coinType: '0x2::sui::SUI',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get native SUI balance error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message || 'Failed to fetch SUI balance',
      },
      { status: 500 }
    );
  }
}

