import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { suiClient, SUI_CONFIG } from '@/lib/sui';

/**
 * @swagger
 * /api/sui/wheels-balance:
 *   get:
 *     summary: Get user's WHEELS token balance from Sui wallet
 *     tags: [Sui]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's WHEELS token balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletAddress:
 *                   type: string
 *                 balance:
 *                   type: string
 *                   description: Balance in smallest unit (9 decimals)
 *                 balanceFormatted:
 *                   type: string
 *                   description: Balance formatted with decimals
 *                 coinType:
 *                   type: string
 *                 coinObjects:
 *                   type: integer
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

    // Get WHEELS token coins (9 decimals)
    const coins = await suiClient.getCoins({
      owner: walletAddress,
      coinType: SUI_CONFIG.coinType,
    });

    // Calculate total balance
    let totalBalance = 0;
    for (const coin of coins.data) {
      totalBalance += parseInt(coin.balance || '0');
    }

    // Format balance with 9 decimals
    const balanceFormatted = (totalBalance / 1_000_000_000).toFixed(9);

    return NextResponse.json({
      walletAddress,
      balance: totalBalance.toString(),
      balanceFormatted,
      coinType: SUI_CONFIG.coinType,
      coinObjects: coins.data.length,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get WHEELS balance error:', error);
    console.error('Wallet address used:', walletAddress);
    console.error('Coin type used:', SUI_CONFIG.coinType);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message || 'Failed to fetch WHEELS balance',
      },
      { status: 500 }
    );
  }
}

