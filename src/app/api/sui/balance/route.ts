import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { suiClient, SUI_CONFIG } from '@/lib/sui';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const walletAddress = user.walletAddress;

    // Get coin objects for the wallet
    const coins = await suiClient.getCoins({
      owner: walletAddress,
      coinType: SUI_CONFIG.coinType,
    });

    // Calculate total balance
    let totalBalance = 0;
    for (const coin of coins.data) {
      totalBalance += parseInt(coin.balance || '0');
    }

    return NextResponse.json({
      walletAddress,
      balance: totalBalance.toString(),
      coinType: SUI_CONFIG.coinType,
      coinObjects: coins.data.length,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get balance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

