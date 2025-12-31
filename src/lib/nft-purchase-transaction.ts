import { Transaction } from '@mysten/sui/transactions';
import { suiClient, SUI_CONFIG } from './sui';
import { getCarTypeFromName } from './nft-mint';
import { getTransferPolicyId } from './transfer-policy-map';
import { getCollectionId } from './collection-map';
import { getTreasuryAddress } from './treasury';

export interface BuildPurchaseTransactionParams {
  carName: string;
  imageUrl: string;
  projectUrl: string;
  rim: string;
  texture: string;
  speed: string;
  brake: string;
  control: string;
  userWalletAddress: string;
  paymentAmount: bigint; // Amount in smallest unit (e.g., 1_000_000_000 for 1 token)
}

/**
 * Build a combined transaction that:
 * 1. Mints the NFT
 * 2. Transfers payment (blastweel tokens) to treasury
 * 3. Transfers the kiosk owner cap to the user
 * 
 * This allows the user to sign a single transaction that handles both payment and minting
 */
export async function buildPurchaseAndMintTransaction(
  params: BuildPurchaseTransactionParams
): Promise<Transaction> {
  const treasuryAddress = getTreasuryAddress();
  if (!treasuryAddress) {
    throw new Error('Treasury wallet address not configured');
  }

  // Get car type and related IDs
  const carType = getCarTypeFromName(params.carName);
  const collectionId = getCollectionId(carType);
  const transferPolicyId = getTransferPolicyId(carType);
  const NFT_PACKAGE_ID = process.env.NFT_PACKAGE_ID || SUI_CONFIG.nftPackageId;
  const NFT_MODULE = 'blastwheelz';
  const typeArgument = `${NFT_PACKAGE_ID}::${NFT_MODULE}::${carType}`;

  // Create transaction
  const tx = new Transaction();

  // Step 1: Get user's blastweel token coins for payment
  const coins = await suiClient.getCoins({
    owner: params.userWalletAddress,
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

  if (totalBalance < params.paymentAmount) {
    throw new Error(`Insufficient balance. Required: ${params.paymentAmount}, Available: ${totalBalance}`);
  }

  // Step 2: Prepare payment coins
  const coinObjects = coins.data.map(coin => tx.object(coin.coinObjectId));
  let paymentCoin;

  if (coinObjects.length > 1) {
    // Merge coins first, then split the exact amount needed
    const mergedCoin = tx.mergeCoins(coinObjects[0], coinObjects.slice(1));
    paymentCoin = tx.splitCoins(mergedCoin, [params.paymentAmount]);
  } else {
    // Split the exact amount needed from single coin
    paymentCoin = tx.splitCoins(coinObjects[0], [params.paymentAmount]);
  }

  // Step 3: Transfer payment to treasury
  tx.transferObjects([paymentCoin], treasuryAddress);

  // Step 4: Mint the NFT
  // Call mint function which:
  // 1. Creates a new kiosk
  // 2. Mints the NFT
  // 3. Locks the NFT in the kiosk with transfer policy
  // 4. Shares the kiosk (makes it accessible by marketplaces)
  // 5. Returns KioskOwnerCap
  const kioskCap = tx.moveCall({
    target: `${NFT_PACKAGE_ID}::${NFT_MODULE}::mint`,
    typeArguments: [typeArgument],
    arguments: [
      tx.object(collectionId),           // collection: &mut Collection<T>
      tx.object(transferPolicyId),        // policy: &mut TransferPolicy<NFT<T>>
      tx.pure.string(params.carName),     // name: String
      tx.pure.string(params.imageUrl),    // image_url: String
      tx.pure.string(params.projectUrl),  // project_url: String
      tx.pure.string(params.rim),         // rim: String
      tx.pure.string(params.texture),     // texture: String
      tx.pure.string(params.speed),       // speed: String
      tx.pure.string(params.brake),       // brake: String
      tx.pure.string(params.control),     // control: String
    ],
  });

  // Step 5: Transfer the kiosk owner cap to the user
  tx.transferObjects([kioskCap], params.userWalletAddress);

  // Set gas budget: 200,000,000 MIST = 0.2 SUI
  // This transaction does: payment transfer + mint + kiosk creation
  tx.setGasBudget(200000000);

  return tx;
}

/**
 * Verify a combined purchase and mint transaction
 * Checks that both payment and minting occurred
 */
export async function verifyPurchaseAndMintTransaction(
  txHash: string,
  expectedPaymentAmount: bigint,
  userWalletAddress: string,
  expectedCarName?: string
): Promise<{
  isValid: boolean;
  nftObjectId?: string;
  kioskId?: string;
  kioskOwnerCapId?: string;
  paymentVerified: boolean;
  mintVerified: boolean;
  error?: string;
}> {
  try {
    const treasuryAddress = getTreasuryAddress();
    if (!treasuryAddress) {
      return { isValid: false, paymentVerified: false, mintVerified: false, error: 'Treasury address not configured' };
    }

    const tx = await suiClient.getTransactionBlock({
      digest: txHash,
      options: {
        showEffects: true,
        showInput: true,
        showBalanceChanges: true,
        showObjectChanges: true,
      },
    });

    // Verify transaction is successful
    if (tx.effects?.status?.status !== 'success') {
      return {
        isValid: false,
        paymentVerified: false,
        mintVerified: false,
        error: `Transaction failed: ${tx.effects?.status?.error || 'Unknown error'}`,
      };
    }

    // Verify sender is the user
    if (tx.transaction?.data?.sender?.toLowerCase() !== userWalletAddress.toLowerCase()) {
      return {
        isValid: false,
        paymentVerified: false,
        mintVerified: false,
        error: 'Transaction sender does not match user wallet address',
      };
    }

    // Verify payment: Check balance changes show tokens going to treasury
    const balanceChanges = tx.balanceChanges || [];
    const treasuryBalanceChange = balanceChanges.find(
      (change: any) => {
        const owner = change.owner?.AddressOwner || change.owner;
        return owner?.toLowerCase() === treasuryAddress.toLowerCase() &&
               change.coinType === SUI_CONFIG.blastweelTokenType;
      }
    );

    // Treasury should receive tokens (positive amount)
    const paymentVerified = treasuryBalanceChange && 
      BigInt(Math.abs(Number(treasuryBalanceChange.amount || '0'))) >= expectedPaymentAmount;

    // Verify mint: Check object changes for NFT creation
    const objectChanges = tx.objectChanges || [];
    
    // Find created NFT
    const createdNFT = objectChanges.find(
      (change: any) => {
        const isNFT = change.objectType?.includes('::blastwheelz::NFT');
        return (change.type === 'created' || change.type === 'transferred') && isNFT;
      }
    ) as { type: string; objectId: string } | undefined;

    // Find shared kiosk
    const sharedKiosk = objectChanges.find(
      (change: any) => {
        const isKiosk = change.objectType?.includes('kiosk::Kiosk');
        const isShared = change.owner && 'Shared' in change.owner;
        return isKiosk && isShared;
      }
    ) as { type: string; objectId: string } | undefined;

    // Find created kiosk owner cap
    const createdKioskCap = objectChanges.find(
      (change: any) => change.type === 'created' && change.objectType?.includes('kiosk::KioskOwnerCap')
    ) as { type: 'created'; objectId: string } | undefined;

    const mintVerified = !!createdNFT && !!createdKioskCap;

    const isValid = paymentVerified && mintVerified;

    return {
      isValid,
      nftObjectId: createdNFT?.objectId,
      kioskId: sharedKiosk?.objectId,
      kioskOwnerCapId: createdKioskCap?.objectId,
      paymentVerified,
      mintVerified,
      error: isValid ? undefined : `Payment: ${paymentVerified ? 'OK' : 'FAILED'}, Mint: ${mintVerified ? 'OK' : 'FAILED'}`,
    };
  } catch (error: any) {
    console.error('Transaction verification error:', error);
    return {
      isValid: false,
      paymentVerified: false,
      mintVerified: false,
      error: error.message || 'Failed to verify transaction',
    };
  }
}

