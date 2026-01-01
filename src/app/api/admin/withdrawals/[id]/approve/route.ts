import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { suiClient, SUI_CONFIG } from '@/lib/sui';
import { getTreasuryKeypair } from '@/lib/treasury';
import { Transaction } from '@mysten/sui/transactions';

/**
 * @swagger
 * /api/admin/withdrawals/{id}/approve:
 *   post:
 *     summary: Approve a withdrawal request (admin only)
 *     tags: [Admin]
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
 *         description: Withdrawal approved and processed
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const admin = await requireRole(req, 'ADMIN');

    // Get the withdrawal request
    const withdrawalRequest = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            walletAddress: true,
            blastwheelzBalance: true,
          },
        },
      },
    });

    if (!withdrawalRequest) {
      return NextResponse.json(
        { error: 'Withdrawal request not found' },
        { status: 404 }
      );
    }

    if (withdrawalRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Withdrawal request is already ${withdrawalRequest.status}` },
        { status: 400 }
      );
    }

    if (withdrawalRequest.type !== 'WITHDRAWAL') {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }

    const withdrawAmount = parseFloat(withdrawalRequest.amount.toString());
    const metadata = withdrawalRequest.metadata as any || {};
    
    // Check if balance was already deducted when request was created
    const balanceAlreadyDeducted = metadata.balanceDeducted === true;
    
    // If balance wasn't deducted yet (legacy requests), verify user has sufficient balance
    if (!balanceAlreadyDeducted) {
      const currentBalance = parseFloat(withdrawalRequest.user.blastwheelzBalance.toString());
      if (currentBalance < withdrawAmount) {
        // Reject the request if insufficient balance
        await prisma.transaction.update({
          where: { id },
          data: {
            status: 'FAILED',
            metadata: {
              ...metadata,
              rejectionReason: 'Insufficient balance at approval time',
              rejectedAt: new Date().toISOString(),
            },
          },
        });
        return NextResponse.json(
          { error: 'User has insufficient balance for this withdrawal' },
          { status: 400 }
        );
      }
    }

    const userWalletAddress = withdrawalRequest.user.walletAddress;
    if (!userWalletAddress || !userWalletAddress.startsWith('0x')) {
      await prisma.transaction.update({
        where: { id },
        data: {
          status: 'FAILED',
          metadata: {
            ...(withdrawalRequest.metadata as any || {}),
            rejectionReason: 'Invalid wallet address',
            rejectedAt: new Date().toISOString(),
          },
        },
      });
      return NextResponse.json(
        { error: 'User wallet address is invalid' },
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
    const primaryCoin = tx.object(coins.data[0].coinObjectId);
    const additionalCoins = coins.data.slice(1).map((coin) => tx.object(coin.coinObjectId));

    if (additionalCoins.length > 0) {
      tx.mergeCoins(primaryCoin, additionalCoins);
    }

    const paymentCoin = tx.splitCoins(primaryCoin, [amountInSmallestUnit]);
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
      await prisma.transaction.update({
        where: { id },
        data: {
          status: 'FAILED',
          metadata: {
            ...(withdrawalRequest.metadata as any || {}),
            rejectionReason: 'On-chain transaction failed',
            error: chainError.message,
            rejectedAt: new Date().toISOString(),
          },
        },
      });
      return NextResponse.json(
        {
          error: 'Withdrawal transaction failed on-chain',
          message: chainError.message || 'signAndExecuteTransaction threw an error',
        },
        { status: 500 }
      );
    }

    if (txResult.effects?.status?.status !== 'success') {
      const chainErrorMessage =
        txResult.effects?.status?.error || 'Unknown on-chain error';
      await prisma.transaction.update({
        where: { id },
        data: {
          status: 'FAILED',
          metadata: {
            ...(withdrawalRequest.metadata as any || {}),
            rejectionReason: 'On-chain transaction failed',
            error: chainErrorMessage,
            rejectedAt: new Date().toISOString(),
          },
        },
      });
      return NextResponse.json(
        {
          error: 'Withdrawal transaction failed on-chain',
          message: chainErrorMessage,
        },
        { status: 500 }
      );
    }

    const suiTxHash = txResult.digest;

    // Update transaction to completed (balance already deducted when request was created)
    const result = await prisma.$transaction(async (txDb) => {
      // Only deduct balance if it wasn't already deducted (for legacy requests)
      let updatedUser;
      if (!balanceAlreadyDeducted) {
        updatedUser = await txDb.user.update({
          where: { id: withdrawalRequest.userId },
          data: {
            blastwheelzBalance: {
              decrement: withdrawAmount,
            },
          },
          select: {
            blastwheelzBalance: true,
          },
        });
      } else {
        // Just fetch current balance (already deducted)
        updatedUser = await txDb.user.findUnique({
          where: { id: withdrawalRequest.userId },
          select: {
            blastwheelzBalance: true,
          },
        });
      }

      // Update transaction to completed
      const updatedTransaction = await txDb.transaction.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          suiTxHash,
          metadata: {
            ...metadata,
            approvedAt: new Date().toISOString(),
            approvedBy: admin.id,
          },
        },
      });

      return { updatedUser, updatedTransaction };
    });

    return NextResponse.json({
      message: 'Withdrawal approved and processed successfully',
      transaction: {
        id: result.updatedTransaction.id,
        amount: result.updatedTransaction.amount.toString(),
        status: result.updatedTransaction.status,
        suiTxHash,
      },
      user: {
        id: withdrawalRequest.userId,
        username: withdrawalRequest.user.username,
        newBalance: result.updatedUser.blastwheelzBalance.toString(),
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Approve withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

