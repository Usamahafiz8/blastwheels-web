import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { suiClient, SUI_CONFIG } from '@/lib/sui';
import { getTreasuryKeypair } from '@/lib/treasury';
import { Transaction } from '@mysten/sui/transactions';

/**
 * @swagger
 * /api/currency/withdraw:
 *   post:
 *     summary: Withdraw/exchange blastwheelz back to Sui tokens (blastweel token)
 *     tags: [Currency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of blastwheelz to withdraw (1:1 conversion to WHEELS tokens)
 *     responses:
 *       200:
 *         description: Withdrawal successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 balance:
 *                   type: string
 *                 transaction:
 *                   type: object
 *       400:
 *         description: Invalid request or insufficient balance
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { amount } = body;

    // Validate input
    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive number' },
        { status: 400 }
      );
    }

    // Get current user balance
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { blastwheelzBalance: true, walletAddress: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentBalance = parseFloat(currentUser.blastwheelzBalance.toString());
    if (currentBalance < withdrawAmount) {
      return NextResponse.json(
        { error: 'Insufficient blastwheelz balance' },
        { status: 400 }
      );
    }

    // Prepare treasury keypair
    const treasuryKeypair = getTreasuryKeypair();
    if (!treasuryKeypair) {
      return NextResponse.json(
        { error: 'Treasury wallet not configured' },
        { status: 500 }
      );
    }

    const userWalletAddress = currentUser.walletAddress;
    if (!userWalletAddress || !userWalletAddress.startsWith('0x')) {
      return NextResponse.json(
        { error: 'User wallet address is not set or invalid' },
        { status: 400 }
      );
    }

    // Convert amount to smallest unit (assuming 9 decimals like WHEELS)
    const amountInSmallestUnit = BigInt(Math.floor(withdrawAmount * 1_000_000_000));

    // Build transfer transaction from treasury to user
    const tx = new Transaction();

    // Get treasury coins for WHEELS token
    const treasuryAddress = treasuryKeypair.toSuiAddress();
    const coins = await suiClient.getCoins({
      owner: treasuryAddress,
      coinType: SUI_CONFIG.coinType,
    });

    if (coins.data.length === 0) {
      return NextResponse.json(
        { error: 'Treasury has insufficient WHEELS balance' },
        { status: 500 }
      );
    }

    // Calculate total balance
    let totalTreasuryBalance = BigInt(0);
    for (const coin of coins.data) {
      totalTreasuryBalance += BigInt(coin.balance || '0');
    }

    if (totalTreasuryBalance < amountInSmallestUnit) {
      return NextResponse.json(
        { error: 'Treasury has insufficient WHEELS balance' },
        { status: 500 }
      );
    }

    // Build coin transfer
    // Use the first coin as the primary coin object
    const primaryCoin = tx.object(coins.data[0].coinObjectId);
    const additionalCoins = coins.data.slice(1).map((coin) => tx.object(coin.coinObjectId));

    // If there are additional coins, merge them into the primary coin
    if (additionalCoins.length > 0) {
      tx.mergeCoins(primaryCoin, additionalCoins);
    }

    // Split the exact amount needed from the primary coin
    const paymentCoin = tx.splitCoins(primaryCoin, [amountInSmallestUnit]);

    // Transfer the payment coin to the user's wallet
    tx.transferObjects([paymentCoin], userWalletAddress);

    tx.setGasBudget(10000000);

    // Sign and execute transaction with treasury wallet
    let txResult;
    try {
      txResult = await suiClient.signAndExecuteTransaction({
        signer: treasuryKeypair,
        transaction: tx,
        options: {
          showEffects: true,
          showBalanceChanges: true,
          showInput: true,
        },
      });
    } catch (chainError: any) {
      console.error('Withdrawal on-chain execution error:', chainError);
      return NextResponse.json(
        {
          error: 'Withdrawal transaction failed on-chain',
          message: chainError.message || 'signAndExecuteTransaction threw an error',
        },
        { status: 500 }
      );
    }

    // Log full txResult for debugging
    console.error('Withdrawal txResult:', JSON.stringify(txResult, null, 2));

    if (txResult.effects?.status?.status !== 'success') {
      const chainErrorMessage =
        txResult.effects?.status?.error || 'Unknown on-chain error';
      return NextResponse.json(
        {
          error: 'Withdrawal transaction failed on-chain',
          message: chainErrorMessage,
        },
        { status: 500 }
      );
    }

    const suiTxHash = txResult.digest;

    // Use database transaction to deduct balance and record withdrawal
    const result = await prisma.$transaction(async (txDb) => {
      // Deduct from user balance (1:1 conversion)
      const updatedUser = await txDb.user.update({
        where: { id: user.id },
        data: {
          blastwheelzBalance: {
            decrement: withdrawAmount,
          },
        },
        select: {
          blastwheelzBalance: true,
        },
      });

      // Create transaction record
      const transaction = await txDb.transaction.create({
        data: {
          userId: user.id,
          type: 'WITHDRAWAL',
          amount: withdrawAmount.toString(),
          suiTxHash,
          status: 'COMPLETED',
          metadata: {
            currencyType: 'blastwheelz',
            conversionRate: 1,
            targetToken: 'WHEELS',
            withdrawalType: 'TREASURY_WITHDRAWAL',
          },
        },
      });

      return { updatedUser, transaction };
    });

    return NextResponse.json({
      message: 'Withdrawal successful',
      balance: result.updatedUser.blastwheelzBalance.toString(),
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount.toString(),
        type: result.transaction.type,
        status: result.transaction.status,
        suiTxHash,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

