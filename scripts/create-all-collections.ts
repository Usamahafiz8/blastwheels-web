/**
 * Create Collections for All 31 Car Types
 * 
 * This script creates collections for all 31 car types defined in the Move contract.
 * Each car type requires its own collection to track minted NFTs.
 * 
 * Required Environment Variables:
 *   - NFT_PACKAGE_ID: The package ID of the deployed contract (defaults to mainnet package)
 *   - ADMIN_CAP_ID: The AdminCap object ID (required for creating collections)
 *   - MINT_SUPPLY: Maximum number of NFTs that can be minted per collection (defaults to 10000)
 *   - ADMIN_PRIVATE_KEY or ADMIN_MNEMONIC: Wallet credentials for signing transactions
 * 
 * Optional Environment Variables:
 *   - SUI_NETWORK: Network URL (defaults to mainnet)
 * 
 * Output:
 *   The script will output all collection IDs that should be added to your .env file
 *   or stored in a collection mapping file.
 */

import { config } from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { getAvailableCarTypes } from '../src/lib/transfer-policy-map';

// Load environment variables from .env.local and .env files
config({ path: '.env.local' });
config({ path: '.env' });

// All 31 car types from the Move contract
const CAR_TYPES = getAvailableCarTypes();

// Configuration from environment variables
const packageId = process.env.NFT_PACKAGE_ID || '0xb3796e6befb4e0a63c1e9260abe3e3c1031d80e22691c4238c5b36cd24145ffd';
const adminCapId = process.env.ADMIN_CAP_ID || process.env.ADMINCAP_ID;
const mintSupply = BigInt(process.env.MINT_SUPPLY || '10000');
const suiNetwork = process.env.SUI_NETWORK || 'https://fullnode.mainnet.sui.io:443';
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || process.env.ADMIN_MNEMONIC || process.env.MNEMONIC || '';
const adminMnemonic = process.env.ADMIN_MNEMONIC || '';

interface CollectionResult {
  carType: string;
  collectionId: string;
  success: boolean;
  error?: string;
}

/**
 * Get admin keypair for signing transactions
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
 * Create a collection for a specific car type
 */
async function createCollectionForCarType(
  client: SuiClient,
  keypair: Ed25519Keypair,
  carType: string
): Promise<CollectionResult> {
  try {
    const typeArgument = `${packageId}::blastwheelz::${carType}`;
    
    console.log(`\n📋 Creating collection for ${carType}...`);
    console.log(`   Type Argument: ${typeArgument}`);

    const tx = new Transaction();
    
    // Create collection (requires AdminCap)
    tx.moveCall({
      target: `${packageId}::blastwheelz::create_collection`,
      arguments: [
        tx.object(adminCapId!), // AdminCap (first parameter)
        tx.pure.u64(mintSupply),
      ],
      typeArguments: [typeArgument],
    });

    tx.setGasBudget(10000000); // 0.01 SUI

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showObjectChanges: true,
        showEffects: true,
        showEvents: true,
      },
    });

    if (result.effects?.status.status !== 'success') {
      throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
    }

    const createdCollection = result.objectChanges?.find(
      (change: any) => change.type === 'created' && change.objectType?.includes('Collection')
    ) as { type: 'created'; objectId: string; objectType: string } | undefined;

    const transferredCollection = result.objectChanges?.find(
      (change: any) => change.type === 'transferred' && change.objectType?.includes('Collection')
    ) as { type: 'transferred'; objectId: string; objectType: string } | undefined;

    const collection = createdCollection || transferredCollection;

    if (collection) {
      console.log(`✅ Created ${carType} Collection`);
      console.log(`   Collection ID: ${collection.objectId}`);
      console.log(`   Transaction: ${result.digest}`);
      
      return {
        carType,
        collectionId: collection.objectId,
        success: true,
      };
    } else {
      throw new Error('Collection created but object ID not found in result');
    }
  } catch (error: any) {
    console.error(`❌ Error creating collection for ${carType}:`, error.message);
    return {
      carType,
      collectionId: '',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main function to create all collections
 */
async function createAllCollections(): Promise<void> {
  try {
    // Validate required environment variables
    if (!adminCapId) {
      throw new Error('ADMIN_CAP_ID must be set in environment variables');
    }

    if (!adminPrivateKey && !adminMnemonic) {
      throw new Error('ADMIN_PRIVATE_KEY or ADMIN_MNEMONIC must be set in environment variables');
    }

    console.log('🚀 Starting Collection Creation for All 31 Car Types');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📦 Package ID: ${packageId}`);
    console.log(`🔑 Admin Cap ID: ${adminCapId}`);
    console.log(`🔢 Mint Supply: ${mintSupply}`);
    console.log(`🌐 Network: ${suiNetwork}`);
    console.log(`🚗 Car Types: ${CAR_TYPES.length}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Get admin keypair
    const keypair = getAdminKeypair();
    const client = new SuiClient({ url: suiNetwork });

    // Check wallet balance
    const address = keypair.toSuiAddress();
    const balance = await client.getBalance({ owner: address });
    const balanceSui = parseInt(balance.totalBalance) / 1_000_000_000;
    
    console.log(`💰 Admin Wallet: ${address}`);
    console.log(`💰 Balance: ${balanceSui} SUI (${balance.totalBalance} MIST)`);
    
    const estimatedGas = CAR_TYPES.length * 0.01; // ~0.01 SUI per collection
    if (parseInt(balance.totalBalance) < estimatedGas * 1_000_000_000) {
      console.warn(`⚠️  Warning: Low balance. Estimated gas needed: ~${estimatedGas} SUI`);
    }
    console.log('');

    // Create collections for each car type
    const results: CollectionResult[] = [];
    
    for (let i = 0; i < CAR_TYPES.length; i++) {
      const carType = CAR_TYPES[i];
      console.log(`\n[${i + 1}/${CAR_TYPES.length}] Processing ${carType}...`);
      
      const result = await createCollectionForCarType(client, keypair, carType);
      results.push(result);
      
      // Small delay between transactions to avoid rate limiting
      if (i < CAR_TYPES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    // Summary
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('📊 COLLECTION CREATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}/${CAR_TYPES.length}`);
    console.log(`❌ Failed: ${failed.length}/${CAR_TYPES.length}\n`);

    if (successful.length > 0) {
      console.log('✅ Successfully Created Collections:');
      console.log('─────────────────────────────────────────────────────\n');
      
      // Output collection mapping
      console.log('// Collection IDs by Car Type');
      console.log('export const COLLECTION_MAP: Record<string, string> = {');
      successful.forEach(result => {
        console.log(`  '${result.carType}': '${result.collectionId}',`);
      });
      console.log('};\n');

      // Output environment variable format
      console.log('// Or add to .env file:');
      successful.forEach(result => {
        const envVar = `COLLECTION_${result.carType.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
        console.log(`${envVar}=${result.collectionId}`);
      });
      console.log('');
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed Collections:');
      console.log('─────────────────────────────────────────────────────');
      failed.forEach(result => {
        console.log(`  ${result.carType}: ${result.error}`);
      });
      console.log('');
    }

    // Save results to JSON file
    const fs = await import('fs');
    const outputPath = './collection-results.json';
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          packageId,
          network: suiNetwork,
          createdAt: new Date().toISOString(),
          results,
          summary: {
            total: CAR_TYPES.length,
            successful: successful.length,
            failed: failed.length,
          },
        },
        null,
        2
      )
    );
    console.log(`💾 Results saved to: ${outputPath}\n`);

    if (failed.length > 0) {
      console.log('⚠️  Some collections failed to create. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('🎉 All collections created successfully!');
    }
  } catch (error: any) {
    console.error('\n❌ Script execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
createAllCollections().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

