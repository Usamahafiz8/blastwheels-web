/**
 * Script to share all NFT collections on-chain
 * Collections must be shared objects for users to mint NFTs using their own wallets
 * 
 * Usage:
 *   npx tsx scripts/share-collections.ts
 * 
 * Environment variables required:
 *   - ADMIN_PRIVATE_KEY or ADMIN_MNEMONIC: Admin account private key or mnemonic
 *   - SUI_NETWORK: Network (mainnet, devnet, localnet) - defaults to mainnet
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { getCollectionId } from '../src/lib/collection-map';
import { getAvailableCarTypesWithCollections } from '../src/lib/collection-map';

// Configuration
const network = (process.env.SUI_NETWORK || 'mainnet') as 'mainnet' | 'devnet' | 'localnet';
const rpcUrl = process.env.SUI_RPC_URL || getFullnodeUrl(network);
const client = new SuiClient({ url: rpcUrl });

// Admin keypair
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || '';
const adminMnemonic = process.env.ADMIN_MNEMONIC || '';

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
  
  throw new Error('ADMIN_PRIVATE_KEY or ADMIN_MNEMONIC must be set in environment variables');
}

/**
 * Check if an object is shared
 */
async function isObjectShared(objectId: string): Promise<boolean> {
  try {
    const obj = await client.getObject({
      id: objectId,
      options: { showOwner: true },
    });
    
    if (obj.data?.owner) {
      return 'Shared' in obj.data.owner;
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking object ${objectId}:`, error);
    return false;
  }
}

/**
 * Share a single collection object
 */
async function shareCollection(collectionId: string, carType: string): Promise<boolean> {
  try {
    // Check if already shared
    const alreadyShared = await isObjectShared(collectionId);
    if (alreadyShared) {
      console.log(`✅ Collection ${carType} (${collectionId}) is already shared`);
      return true;
    }

    console.log(`\n🔄 Sharing collection ${carType}...`);
    console.log(`   Collection ID: ${collectionId}`);

    const adminKeypair = getAdminKeypair();
    const adminAddress = adminKeypair.toSuiAddress();
    console.log(`   Admin Address: ${adminAddress}`);

    // Create transaction to share the collection
    const tx = new Transaction();
    
    // Use the Sui framework's transfer::share_object function
    // This requires the object to be owned by the transaction sender
    // The function signature is: public fun share_object<T: key>(obj: T)
    tx.moveCall({
      target: '0x2::transfer::share_object',
      typeArguments: [], // No type arguments needed
      arguments: [tx.object(collectionId)],
    });

    tx.setGasBudget(100000000); // 0.1 SUI

    console.log('📤 Executing transaction...');
    const result = await client.signAndExecuteTransaction({
      signer: adminKeypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (result.effects?.status.status !== 'success') {
      throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
    }

    console.log(`✅ Successfully shared collection ${carType}!`);
    console.log(`   Transaction Digest: ${result.digest}`);
    
    // Verify it's now shared
    const isShared = await isObjectShared(collectionId);
    if (isShared) {
      console.log(`   ✅ Verified: Collection is now shared`);
    } else {
      console.log(`   ⚠️  Warning: Collection may not be shared yet (check transaction)`);
    }

    return true;
  } catch (error: any) {
    console.error(`❌ Error sharing collection ${carType}:`, error.message || error);
    return false;
  }
}

/**
 * Share all collections
 */
async function shareAllCollections() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 Sharing NFT Collections on Sui Blockchain');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${rpcUrl}\n`);

  const carTypes = getAvailableCarTypesWithCollections();
  console.log(`Found ${carTypes.length} collections to check/share\n`);

  const results: { carType: string; success: boolean }[] = [];

  for (const carType of carTypes) {
    try {
      const collectionId = getCollectionId(carType);
      const success = await shareCollection(collectionId, carType);
      results.push({ carType, success });
      
      // Small delay between transactions to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`❌ Error processing ${carType}:`, error.message || error);
      results.push({ carType, success: false });
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successfully shared: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}\n`);

  if (failed > 0) {
    console.log('Failed collections:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.carType}`);
    });
  }

  console.log('\n✅ Done! Collections are now shared and users can mint NFTs.');
}

// Run the script
shareAllCollections().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

