import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { suiClient, SUI_CONFIG } from './sui';

// Treasury wallet configuration
const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
const treasuryWalletAddress = process.env.TREASURY_WALLET_ADDRESS;

if (!treasuryPrivateKey) {
  console.warn('⚠️  TREASURY_PRIVATE_KEY not set in environment variables');
}

if (!treasuryWalletAddress) {
  console.warn('⚠️  TREASURY_WALLET_ADDRESS not set in environment variables');
}

/**
 * Get treasury wallet keypair
 */
export function getTreasuryKeypair(): Ed25519Keypair | null {
  if (!treasuryPrivateKey) {
    return null;
  }
  try {
    // 1) Bech32 Sui private key format: suiprivkey1...
    if (treasuryPrivateKey.startsWith('suiprivkey')) {
      const { secretKey } = decodeSuiPrivateKey(treasuryPrivateKey.trim());
      return Ed25519Keypair.fromSecretKey(secretKey);
    }

    // 2) Hex / base64 formats
    let privateKeyBytes: Uint8Array;
    const trimmed = treasuryPrivateKey.trim();

    if (trimmed.startsWith('0x')) {
      // Hex format with 0x
      privateKeyBytes = Uint8Array.from(Buffer.from(trimmed.slice(2), 'hex'));
    } else {
      // Try hex without 0x, then base64
      try {
        privateKeyBytes = Uint8Array.from(Buffer.from(trimmed, 'hex'));
      } catch {
        privateKeyBytes = Uint8Array.from(Buffer.from(trimmed, 'base64'));
      }
    }

    return Ed25519Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    console.error('Failed to create treasury keypair:', error);
    return null;
  }
}

/**
 * Get treasury wallet address
 */
export function getTreasuryAddress(): string | null {
  return treasuryWalletAddress || null;
}

/**
 * Create a transaction to transfer blastweel tokens from user to treasury
 * Note: This creates the transaction but doesn't execute it. The user must sign it.
 */
export async function createPurchaseTransaction(
  userWalletAddress: string,
  amount: bigint
): Promise<Transaction> {
  const treasuryAddress = getTreasuryAddress();
  if (!treasuryAddress) {
    throw new Error('Treasury wallet address not configured');
  }

  const tx = new Transaction();

  // Get user's coin objects for the blastweel token
  const coins = await suiClient.getCoins({
    owner: userWalletAddress,
    coinType: SUI_CONFIG.blastweelTokenType,
  });

  if (coins.data.length === 0) {
    throw new Error('Insufficient blastweel token balance');
  }

  // Calculate total available balance
  let totalBalance = BigInt(0);
  for (const coin of coins.data) {
    totalBalance += BigInt(coin.balance || '0');
  }

  if (totalBalance < amount) {
    throw new Error('Insufficient balance');
  }

  // Merge coins if needed and transfer to treasury
  const coinObjects = coins.data.map(coin => tx.object(coin.coinObjectId));
  
  if (coinObjects.length > 1) {
    // Merge coins first
    const mergedCoin = tx.mergeCoins(
      coinObjects[0],
      coinObjects.slice(1)
    );
    // Split the exact amount needed
    const paymentCoin = tx.splitCoins(mergedCoin, [amount]);
    // Transfer to treasury
    tx.transferObjects([paymentCoin], treasuryAddress);
  } else {
    // Split the exact amount needed
    const paymentCoin = tx.splitCoins(coinObjects[0], [amount]);
    // Transfer to treasury
    tx.transferObjects([paymentCoin], treasuryAddress);
  }

  tx.setGasBudget(10000000); // 0.01 SUI

  return tx;
}

/**
 * Verify a transaction that transferred tokens to treasury
 */
export async function verifyPurchaseTransaction(
  txHash: string,
  expectedAmount: bigint,
  userWalletAddress: string
): Promise<boolean> {
  try {
    const treasuryAddress = getTreasuryAddress();
    if (!treasuryAddress) {
      return false;
    }

    const tx = await suiClient.getTransactionBlock({
      digest: txHash,
      options: {
        showEffects: true,
        showInput: true,
        showBalanceChanges: true,
      },
    });

    // Verify transaction is successful
    if (tx.effects?.status?.status !== 'success') {
      return false;
    }

    // Verify sender is the user
    if (tx.transaction?.data?.sender !== userWalletAddress) {
      return false;
    }

    // Verify balance changes show tokens going to treasury
    const balanceChanges = tx.balanceChanges || [];
    const treasuryBalanceChange = balanceChanges.find(
      (change: any) => change.owner?.AddressOwner === treasuryAddress
    );

    if (!treasuryBalanceChange) {
      return false;
    }

    // Check if the amount matches (considering token type)
    const amount = BigInt(treasuryBalanceChange.amount || '0');
    return amount >= expectedAmount;
  } catch (error) {
    console.error('Transaction verification error:', error);
    return false;
  }
}

