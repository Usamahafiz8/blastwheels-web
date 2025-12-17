import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { suiClient, SUI_CONFIG } from '@/lib/sui';

/**
 * @swagger
 * /api/currency/token-balance:
 *   get:
 *     summary: Get user's blastweel token balance from Sui wallet
 *     tags: [Currency]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's blastweel token balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletAddress:
 *                   type: string
 *                 balance:
 *                   type: string
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
    const walletAddress = user.walletAddress;

    // Get coin objects for the blastweel token
    const coins = await suiClient.getCoins({
      owner: walletAddress,
      coinType: SUI_CONFIG.blastweelTokenType,
    });

    // Calculate total balance
    let totalBalance = 0;
    for (const coin of coins.data) {
      totalBalance += parseInt(coin.balance || '0');
    }

    return NextResponse.json({
      walletAddress,
      balance: totalBalance.toString(),
      coinType: SUI_CONFIG.blastweelTokenType,
      coinObjects: coins.data.length,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get token balance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

