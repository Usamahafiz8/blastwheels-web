import { Transaction } from '@mysten/sui/transactions';
import { getCarTypeFromName } from './nft-mint';
import { getTransferPolicyId } from './transfer-policy-map';
import { getCollectionId } from './collection-map';
import { SUI_CONFIG } from './sui';

const NFT_PACKAGE_ID = process.env.NFT_PACKAGE_ID || SUI_CONFIG.nftPackageId;
const NFT_MODULE = 'blastwheelz';

export interface BuildMintTransactionParams {
  carName: string;
  imageUrl: string;
  projectUrl: string;
  rim: string;
  texture: string;
  speed: string;
  brake: string;
  control: string;
  userWalletAddress: string;
}

/**
 * Build a mint-only transaction that the user can sign with their wallet
 * This transaction only mints the NFT - no payment is included
 * The user pays gas fees from their Sui wallet
 */
export async function buildMintOnlyTransaction(
  params: BuildMintTransactionParams
): Promise<Transaction> {
  // Get car type and related IDs
  const carType = getCarTypeFromName(params.carName);
  const collectionId = getCollectionId(carType);
  const transferPolicyId = getTransferPolicyId(carType);
  const typeArgument = `${NFT_PACKAGE_ID}::${NFT_MODULE}::${carType}`;

  // Log package ID for debugging
  console.log('🔧 Building mint transaction with package ID:', NFT_PACKAGE_ID);
  console.log('🔧 Car type:', carType);
  console.log('🔧 Collection ID:', collectionId);
  console.log('🔧 Transfer Policy ID:', transferPolicyId);

  // Check if collection and transfer policy are shared objects
  const { suiClient } = await import('./sui');
  
  const [collectionObj, policyObj] = await Promise.all([
    suiClient.getObject({ id: collectionId, options: { showOwner: true } }),
    suiClient.getObject({ id: transferPolicyId, options: { showOwner: true } }),
  ]);

  // Check if objects are shared - handle ObjectOwner type (can be string or object)
  const checkIsShared = (owner: any): boolean => {
    if (!owner) return false;
    if (typeof owner === 'string') return false;
    const ownerObj = owner as Record<string, unknown>;
    return ownerObj !== null && 'Shared' in ownerObj;
  };

  // Extract initial shared version from owner data
  const getInitialSharedVersion = (owner: any): string | number | null => {
    if (!owner || typeof owner === 'string') return null;
    const ownerObj = owner as Record<string, any>;
    if (ownerObj.Shared && typeof ownerObj.Shared === 'object' && ownerObj.Shared.initial_shared_version) {
      return ownerObj.Shared.initial_shared_version;
    }
    return null;
  };

  const isCollectionShared = checkIsShared(collectionObj.data?.owner);
  const isPolicyShared = checkIsShared(policyObj.data?.owner);
  const collectionSharedVersion = getInitialSharedVersion(collectionObj.data?.owner);
  const policySharedVersion = getInitialSharedVersion(policyObj.data?.owner);

  console.log('🔧 Collection is shared:', isCollectionShared);
  console.log('🔧 Transfer Policy is shared:', isPolicyShared);

  if (!isCollectionShared || !collectionSharedVersion) {
    const errorMessage = 
      `Collection is not shared. ` +
      `To enable user wallet minting, collections must be shared objects on the Sui blockchain. ` +
      `Please run: npm run share-collections (or npx tsx scripts/share-collections.ts) ` +
      `with your ADMIN_PRIVATE_KEY or ADMIN_MNEMONIC set in your .env file. ` +
      `Collection ID: ${collectionId} (Car Type: ${carType})`;
    
    console.error('❌ Collection sharing error:', errorMessage);
    throw new Error(errorMessage);
  }

  if (!isPolicyShared || !policySharedVersion) {
    const errorMessage = 
      `Transfer policy is not shared. ` +
      `To enable user wallet minting, transfer policies must be shared objects on the Sui blockchain. ` +
      `Transfer Policy ID: ${transferPolicyId} (Car Type: ${carType})`;
    
    console.error('❌ Transfer policy sharing error:', errorMessage);
    throw new Error(errorMessage);
  }

  // At this point, we know both are shared and have versions
  // TypeScript needs explicit non-null assertions
  const collectionVersion = collectionSharedVersion as string | number;
  const policyVersion = policySharedVersion as string | number;

  // Create transaction
  const tx = new Transaction();

  // Mint the NFT
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
        tx.sharedObjectRef({
          objectId: collectionId,
          mutable: true,
          initialSharedVersion: collectionVersion,
        }),  // collection: &mut Collection<T>
        tx.sharedObjectRef({
          objectId: transferPolicyId,
          mutable: true,
          initialSharedVersion: policyVersion,
        }),  // policy: &mut TransferPolicy<NFT<T>>
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

  // Transfer the kiosk owner cap to the user
  tx.transferObjects([kioskCap], params.userWalletAddress);

  // Set gas budget: 150,000,000 MIST = 0.15 SUI
  // This transaction creates a kiosk, mints an NFT, and locks it
  tx.setGasBudget(150000000);

  return tx;
}

/**
 * Verify a mint transaction
 * Checks that the NFT was minted successfully
 */
export async function verifyMintTransaction(
  txHash: string,
  userWalletAddress: string,
  expectedCarName?: string
): Promise<{
  isValid: boolean;
  nftObjectId?: string;
  kioskId?: string;
  kioskOwnerCapId?: string;
  error?: string;
}> {
  try {
    const { suiClient } = await import('./sui');
    
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
        error: `Transaction failed: ${tx.effects?.status?.error || 'Unknown error'}`,
      };
    }

    // Verify sender is the user
    if (tx.transaction?.data?.sender?.toLowerCase() !== userWalletAddress.toLowerCase()) {
      return {
        isValid: false,
        error: 'Transaction sender does not match user wallet address',
      };
    }

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

    const isValid = !!createdNFT && !!createdKioskCap;

    return {
      isValid,
      nftObjectId: createdNFT?.objectId,
      kioskId: sharedKiosk?.objectId,
      kioskOwnerCapId: createdKioskCap?.objectId,
      error: isValid ? undefined : 'NFT minting verification failed. NFT details not found in transaction.',
    };
  } catch (error: any) {
    console.error('Transaction verification error:', error);
    return {
      isValid: false,
      error: error.message || 'Failed to verify transaction',
    };
  }
}

