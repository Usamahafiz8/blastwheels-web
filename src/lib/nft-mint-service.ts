import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { suiClient, SUI_CONFIG } from './sui';
import { getCarTypeFromName } from './nft-mint';
import { getTransferPolicyId } from './transfer-policy-map';
import { getCollectionId } from './collection-map';

// NFT Package Configuration
const NFT_PACKAGE_ID = process.env.NFT_PACKAGE_ID || SUI_CONFIG.nftPackageId;
const NFT_MODULE = 'blastwheelz';
// Collection ID is now dynamic per car type - use getCollectionId(carType) instead

// Admin keypair for minting (server-side)
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || process.env.MNEMONIC || '';
const adminMnemonic = process.env.ADMIN_MNEMONIC || '';

interface MintNFTParams {
  carName: string;
  imageUrl: string;
  projectUrl: string;
  rim: string;
  texture: string;
  speed: string;
  brake: string;
  control: string;
  ownerAddress: string; // User's wallet address to receive the kiosk owner cap
}

interface MintNFTResult {
  success: boolean;
  nftObjectId?: string;
  kioskId?: string;
  kioskOwnerCapId?: string;
  transactionDigest?: string;
  error?: string;
}

/**
 * Get admin keypair for signing mint transactions
 */
function getAdminKeypair(): Ed25519Keypair {
  if (adminMnemonic) {
    return Ed25519Keypair.deriveKeypair(adminMnemonic);
  }
  
  if (adminPrivateKey) {
    try {
      // Try bech32 format first
      if (adminPrivateKey.startsWith('suiprivkey')) {
        const { secretKey } = decodeSuiPrivateKey(adminPrivateKey.trim());
        return Ed25519Keypair.fromSecretKey(secretKey);
      }
      
      // Try hex format
      let privateKeyBytes: Uint8Array;
      const trimmed = adminPrivateKey.trim();
      
      if (trimmed.startsWith('0x')) {
        privateKeyBytes = Uint8Array.from(Buffer.from(trimmed.slice(2), 'hex'));
      } else {
        try {
          privateKeyBytes = Uint8Array.from(Buffer.from(trimmed, 'hex'));
        } catch {
          privateKeyBytes = Uint8Array.from(Buffer.from(trimmed, 'base64'));
        }
      }
      
      return Ed25519Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
      throw new Error(`Failed to create admin keypair: ${error}`);
    }
  }
  
  throw new Error('ADMIN_PRIVATE_KEY, ADMIN_MNEMONIC, or MNEMONIC must be set in environment variables');
}

/**
 * Mint an NFT and transfer the kiosk owner cap to the user
 * This function executes the mint transaction on-chain
 */
export async function mintNFTOnChain(params: MintNFTParams): Promise<MintNFTResult> {
  try {
    // Get admin keypair
    const adminKeypair = getAdminKeypair();
    const client = suiClient;

    // Get car type from name
    const carType = getCarTypeFromName(params.carName);
    
    // Get the correct collection ID for this car type
    const collectionId = getCollectionId(carType);
    
    // Get the correct transfer policy ID for this car type
    const transferPolicyId = getTransferPolicyId(carType);
    
    const typeArgument = `${NFT_PACKAGE_ID}::${NFT_MODULE}::${carType}`;

    console.log('📋 Mint Configuration:');
    console.log(`   Package ID: ${NFT_PACKAGE_ID}`);
    console.log(`   Collection ID: ${collectionId}`);
    console.log(`   Car Type: ${carType}`);
    console.log(`   Transfer Policy ID: ${transferPolicyId}`);
    console.log(`   NFT Type: ${typeArgument}`);
    console.log(`   Owner Address: ${params.ownerAddress}`);
    console.log(`   Car Name: ${params.carName}\n`);

    // Check admin wallet balance for gas
    const adminAddress = adminKeypair.toSuiAddress();
    const balance = await client.getBalance({ owner: adminAddress });
    const balanceSui = parseInt(balance.totalBalance) / 1_000_000_000;
    
    console.log(`💰 Admin Wallet Balance: ${balanceSui} SUI (${balance.totalBalance} MIST)`);
    
    if (parseInt(balance.totalBalance) < 100_000_000) {
      console.warn('⚠️  Warning: Low admin balance. This transaction requires at least 0.1 SUI for gas.');
    }

    // Create transaction
    console.log('🚀 Creating mint transaction...');
    const tx = new Transaction();
    
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
        tx.object(collectionId),           // collection: &mut Collection<T> (car-type specific)
        tx.object(transferPolicyId),        // policy: &mut TransferPolicy<NFT<T>> (car-type specific)
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

    // Transfer the returned kiosk owner cap to the user
    // Note: The kiosk itself is shared (public), so it's accessible by marketplaces
    tx.transferObjects([kioskCap], params.ownerAddress);

    // Set gas budget: 150,000,000 MIST = 0.15 SUI
    // This transaction creates a kiosk, mints an NFT, and locks it
    tx.setGasBudget(150000000);

    console.log('📤 Executing transaction...\n');
    const result = await client.signAndExecuteTransaction({
      signer: adminKeypair,
      transaction: tx,
      options: {
        showObjectChanges: true,
        showEffects: true,
        showEvents: true,
        showBalanceChanges: true,
      },
    });

    // Check transaction status
    if (result.effects?.status.status !== 'success') {
      throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
    }

    console.log('✅ Transaction successful!');
    console.log(`Transaction Digest: ${result.digest}\n`);

    // Extract created objects from transaction result
    const objectChanges = result.objectChanges || [];
    
    // Find shared kiosk (shared objects have owner with Shared property)
    const sharedKiosk = objectChanges.find(
      (change: any) => {
        const isKiosk = change.objectType?.includes('kiosk::Kiosk');
        const isShared = change.owner && 'Shared' in change.owner;
        return isKiosk && isShared;
      }
    ) as { type: string; objectId: string; owner?: any } | undefined;

    // Find created kiosk owner cap
    const createdKioskCap = objectChanges.find(
      (change: any) => change.type === 'created' && change.objectType?.includes('kiosk::KioskOwnerCap')
    ) as { type: 'created'; objectId: string } | undefined;

    // Find created NFT (may be in kiosk, so check for created or transferred)
    const createdNFT = objectChanges.find(
      (change: any) => {
        const isNFT = change.objectType?.includes('::blastwheelz::NFT');
        return (change.type === 'created' || change.type === 'transferred') && isNFT;
      }
    ) as { type: string; objectId: string } | undefined;

    const kioskId = sharedKiosk?.objectId;
    const kioskCapId = createdKioskCap?.objectId;
    const nftId = createdNFT?.objectId;

    if (!kioskCapId) {
      throw new Error('Could not find kiosk owner cap in transaction result');
    }

    console.log('📦 Created Objects:');
    if (nftId) {
      console.log(`   🎯 NFT Object ID: ${nftId}`);
    }
    if (kioskId) {
      console.log(`   🏪 Shared Kiosk ID: ${kioskId}`);
    }
    console.log(`   🔑 Kiosk Owner Cap ID: ${kioskCapId}\n`);

    return {
      success: true,
      nftObjectId: nftId,
      kioskId,
      kioskOwnerCapId: kioskCapId,
      transactionDigest: result.digest,
    };
  } catch (error: any) {
    console.error('❌ Error minting NFT:', error.message);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Mint multiple NFTs (for bulk purchases)
 */
export async function mintMultipleNFTs(
  params: MintNFTParams[],
  ownerAddress: string
): Promise<MintNFTResult[]> {
  const results: MintNFTResult[] = [];
  
  for (const param of params) {
    const result = await mintNFTOnChain({
      ...param,
      ownerAddress,
    });
    results.push(result);
    
    // Add a small delay between mints to avoid rate limiting
    if (results.length < params.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

