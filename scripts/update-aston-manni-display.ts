import { config } from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { PrismaClient } from '@prisma/client';

config(); // Load environment variables

const CAR_NAME = 'The Aston Manni';
const CAR_TYPE = 'AstonManni';
const NEW_IMAGE_URL = 'https://blast-wheels.com/image11.jpeg';

// Optional: Provide specific NFT object IDs to update (comma-separated)
// Or leave empty to skip individual NFT updates
// Example NFT from user: 0xc82ac40e4330aff95f9476e46afb8f9696c43406f8ad11b52a108cc680a4ecdc
const NFT_OBJECT_IDS_STR = process.env.NFT_OBJECT_IDS || '0xc82ac40e4330aff95f9476e46afb8f9696c43406f8ad11b52a108cc680a4ecdc';
const NFT_OBJECT_IDS = NFT_OBJECT_IDS_STR.split(',').map(id => id.trim()).filter(id => id.length > 0);

// Sui configuration
const packageId = process.env.NFT_PACKAGE_ID || '0xb3796e6befb4e0a63c1e9260abe3e3c1031d80e22691c4238c5b36cd24145ffd';
const publisherId = process.env.PUBLISHER_ID || '';
const suiNetwork = process.env.SUI_NETWORK || 'https://fullnode.mainnet.sui.io:443';
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || process.env.ADMIN_MNEMONIC || process.env.MNEMONIC || '';

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Sui client
const client = new SuiClient({ url: suiNetwork });

function getAdminKeypair(): Ed25519Keypair {
  if (!adminPrivateKey) {
    throw new Error('ADMIN_PRIVATE_KEY or ADMIN_MNEMONIC must be set in environment variables');
  }

  // Try mnemonic first (most common format - 12+ words)
  const words = adminPrivateKey.trim().split(/\s+/);
  if (words.length >= 12) {
    try {
      return Ed25519Keypair.deriveKeypair(adminPrivateKey);
    } catch (mnemonicError: any) {
      // If mnemonic fails, continue to try private key format
      console.log('⚠️  Failed to parse as mnemonic, trying private key format...');
    }
  }

  // Try to decode as Sui private key format
  try {
    const { secretKey } = decodeSuiPrivateKey(adminPrivateKey);
    return Ed25519Keypair.fromSecretKey(secretKey);
  } catch (keyError: any) {
    // Last attempt: try deriving keypair anyway (might be a different format)
    try {
      return Ed25519Keypair.deriveKeypair(adminPrivateKey);
    } catch (finalError: any) {
      throw new Error(
        `Failed to parse admin key. Please ensure:\n` +
        `  - ADMIN_PRIVATE_KEY is a valid Sui private key (suiprivkey1...)\n` +
        `  - Or ADMIN_MNEMONIC is a valid 12+ word mnemonic phrase\n` +
        `  - Or MNEMONIC is set with a valid mnemonic\n\n` +
        `Error: ${finalError.message || 'Unknown error'}`
      );
    }
  }
}

/**
 * Find the display object for AstonManni NFT type
 * Note: Display objects are typically shared, so they may not appear in owned objects
 * You may need to provide the display object ID manually from Sui Explorer
 */
async function findDisplayObject(): Promise<string | null> {
  try {
    console.log('🔍 Searching for display object for AstonManni NFT type...');
    
    const nftType = `${packageId}::blastwheelz::NFT<${packageId}::blastwheelz::${CAR_TYPE}>`;
    const displayType = `0x2::display::Display<${nftType}>`;
    
    // Try to find display objects owned by the publisher
    if (publisherId) {
      const displayObjects = await client.getOwnedObjects({
        owner: publisherId,
        filter: {
          StructType: displayType,
        },
        options: {
          showType: true,
          showContent: true,
          showDisplay: true,
        },
      });

      if (displayObjects.data && displayObjects.data.length > 0) {
        const displayId = displayObjects.data[0].data?.objectId;
        console.log(`✅ Found display object: ${displayId}`);
        return displayId || null;
      }
    }

    // Display objects are often shared, so they won't appear in owned objects
    console.log('⚠️  Display object not found in owned objects.');
    console.log('💡 Display objects are typically shared. You may need to:');
    console.log('   1. Find the display object ID from Sui Explorer');
    console.log('   2. Or provide it as an environment variable: DISPLAY_ID');
    console.log('   3. Or modify this script to accept the display ID as a parameter');
    
    // Check for DISPLAY_ID environment variable
    const displayIdFromEnv = process.env.DISPLAY_ID || process.env.ASTONMANNI_DISPLAY_ID;
    if (displayIdFromEnv) {
      console.log(`✅ Using display ID from environment: ${displayIdFromEnv}`);
      return displayIdFromEnv;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Error finding display object:', error.message);
    return null;
  }
}

/**
 * Update individual NFT's image_url field on-chain
 * Uses the update_nft function from the Move contract
 */
async function updateNFTOnChain(nftObjectId: string): Promise<boolean> {
  try {
    console.log(`🔄 Updating NFT ${nftObjectId} on-chain...`);
    console.log(`   Setting image_url to: ${NEW_IMAGE_URL}\n`);

    const keypair = getAdminKeypair();
    const nftType = `${packageId}::blastwheelz::NFT<${packageId}::blastwheelz::${CAR_TYPE}>`;

    // Get the NFT to verify it exists and check ownership
    const nftObj = await client.getObject({
      id: nftObjectId,
      options: { showContent: true, showOwner: true },
    });

    if (nftObj.error || !nftObj.data) {
      throw new Error(`Failed to fetch NFT: ${nftObjectId}`);
    }

    const content = nftObj.data.content as any;
    if (!content || content.dataType !== 'moveObject') {
      throw new Error(`Invalid NFT object: ${nftObjectId}`);
    }

    const currentName = content.fields.name || 'The Aston Manni';
    const currentProjectUrl = content.fields.project_url || 'https://blastwheelz.io';
    const currentRim = content.fields.rim || 'Standard Alloy Rims';
    const currentTexture = content.fields.texture || 'Standard Texture';
    const currentSpeed = content.fields.speed || 'Standard Speed';
    const currentBrake = content.fields.brake || 'Standard Brakes';
    const currentControl = content.fields.control || 'Standard Control';

    console.log('📋 Current NFT data:');
    console.log(`   Name: ${currentName}`);
    console.log(`   Current image_url: ${content.fields.image_url || '(empty)'}`);

    // Update NFT using update_nft function
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${packageId}::blastwheelz::update_nft`,
      arguments: [
        tx.object(nftObjectId),
        tx.pure.string(currentName), // Keep existing name
        tx.pure.string(NEW_IMAGE_URL), // Update image_url
        tx.pure.string(currentProjectUrl), // Keep existing project_url
        tx.pure.string(currentRim), // Keep existing rim
        tx.pure.string(currentTexture), // Keep existing texture
        tx.pure.string(currentSpeed), // Keep existing speed
        tx.pure.string(currentBrake), // Keep existing brake
        tx.pure.string(currentControl), // Keep existing control
      ],
      typeArguments: [nftType],
    });

    tx.setGasBudget(100000000); // 0.1 SUI

    console.log('📤 Executing NFT update transaction...');
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showObjectChanges: true,
        showEffects: true,
        showEvents: true,
        showInput: true,
      },
    });

    if (result.effects?.status.status !== 'success') {
      throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
    }

    console.log(`\n✅ NFT updated successfully!`);
    console.log(`   Transaction Digest: ${result.digest}`);
    console.log(`   New Image URL: ${NEW_IMAGE_URL}\n`);
    return true;
  } catch (error: any) {
    console.error('❌ Error updating NFT on-chain:', error.message);
    if (error.message.includes('ownership') || error.message.includes('owner')) {
      console.error('   Note: You must own the NFT or have admin permissions to update it');
    }
    return false;
  }
}

/**
 * Update the display object to use the new image URL
 * Following the exact pattern from display.ts
 */
async function updateDisplayOnChain(displayId: string): Promise<boolean> {
  try {
    if (!publisherId) {
      throw new Error('PUBLISHER_ID must be set to update display');
    }
    if (!packageId) {
      throw new Error('PACKAGE_ID not set');
    }

    const keypair = getAdminKeypair();
    const signerAddress = keypair.toSuiAddress();

    // Verify publisher object (same as display.ts)
    const publisherObj = await client.getObject({
      id: publisherId,
      options: { showType: true },
    });
    if (publisherObj.error || !publisherObj.data || publisherObj.data.type !== '0x2::package::Publisher') {
      throw new Error(`Invalid PUBLISHER_ID: ${publisherId} is not a valid Publisher object`);
    }

    // Get the current display to verify it exists
    const displayObj = await client.getObject({
      id: displayId,
      options: { showContent: true, showDisplay: true },
    });

    if (displayObj.error || !displayObj.data) {
      throw new Error(`Failed to fetch display object: ${displayId}`);
    }

    const currentDisplay = displayObj.data.display?.data as any;
    console.log('📋 Current display image_url:', currentDisplay?.image_url || '(empty or using template)');

    const tx = new Transaction();
    const BASE_TYPE = `${packageId}::blastwheelz::${CAR_TYPE}`;
    const NFT_TYPE = `${packageId}::blastwheelz::NFT<${BASE_TYPE}>`;

    console.log(`🔄 Updating display object ${displayId} on-chain...`);
    console.log(`   Setting image_url to: ${NEW_IMAGE_URL}`);
    console.log(`   NFT Type: ${NFT_TYPE}\n`);

    // Edit the image_url field in the display (following display.ts pattern)
    tx.moveCall({
      target: '0x2::display::edit',
      arguments: [
        tx.object(displayId),
        tx.pure.string('image_url'),
        tx.pure.string(NEW_IMAGE_URL),
      ],
      typeArguments: [NFT_TYPE],
    });

    // Update version to apply changes (required after editing, same as display.ts)
    tx.moveCall({
      target: '0x2::display::update_version',
      arguments: [tx.object(displayId)],
      typeArguments: [NFT_TYPE],
    });

    // Display objects should remain with Publisher, not transferred to wallet
    // (same comment as display.ts)
    tx.setGasBudget(60000000); // Same as display.ts

    console.log('📤 Executing display update transaction...');
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: {
        showObjectChanges: true,
        showEffects: true,
        showEvents: true,
        showInput: true,
      },
    });

    if (result.effects?.status.status !== 'success') {
      throw new Error(`Transaction failed: ${result.effects?.status.error || JSON.stringify(result, null, 2)}`);
    }

    console.log(`\n✅ Display updated successfully!`);
    console.log(`   Transaction Digest: ${result.digest}`);
    console.log(`   New Image URL: ${NEW_IMAGE_URL}`);
    console.log(`   All AstonManni NFTs will now display this image\n`);

    return true;
  } catch (error: any) {
    console.error('❌ Error updating display on-chain:', error.message);
    throw error;
  }
}

/**
 * Update database records
 */
async function updateDatabase(): Promise<void> {
  try {
    console.log('💾 Updating database records...');

    // Update marketplace items
    const marketplaceItems = await prisma.marketplaceItem.updateMany({
      where: {
        name: {
          contains: 'Aston Manni',
        },
      },
      data: {
        imageUrl: NEW_IMAGE_URL,
      },
    });

    console.log(`✅ Updated ${marketplaceItems.count} marketplace item(s)`);

    // Update existing NFTs in database
    const nfts = await prisma.nFT.updateMany({
      where: {
        name: {
          contains: 'Aston Manni',
        },
      },
      data: {
        imageUrl: NEW_IMAGE_URL,
      },
    });

    console.log(`✅ Updated ${nfts.count} NFT record(s) in database`);

    // Also update by car type in metadata
    // Note: Prisma JSON queries work differently in MySQL/MariaDB
    // We'll fetch all NFTs and filter in code to avoid database-specific JSON syntax issues
    try {
      const allNFTs = await prisma.nFT.findMany({
        select: { id: true, metadata: true },
      });

      const nftsByCarType = allNFTs.filter((nft) => {
        if (!nft.metadata || typeof nft.metadata !== 'object') return false;
        const metadata = nft.metadata as any;
        return metadata.carType === CAR_TYPE;
      });

      if (nftsByCarType.length > 0) {
        const nftIds = nftsByCarType.map(nft => nft.id);
        const nftsByCarTypeCount = await prisma.nFT.updateMany({
          where: {
            id: { in: nftIds },
          },
          data: {
            imageUrl: NEW_IMAGE_URL,
          },
        });
        console.log(`✅ Updated ${nftsByCarTypeCount.count} additional NFT record(s) by car type`);
      } else {
        console.log(`✅ No additional NFTs found by car type`);
      }
    } catch (error: any) {
      // If this fails, skip (not critical)
      console.log(`⚠️  Could not update NFTs by car type: ${error.message}`);
      console.log(`   This is not critical - main updates completed successfully`);
    }

  } catch (error: any) {
    console.error('❌ Error updating database:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting blockchain update for The Aston Manni...\n');
    console.log(`   Car Type: ${CAR_TYPE}`);
    console.log(`   New Image URL: ${NEW_IMAGE_URL}\n`);

    let nftsUpdated = 0;
    let displayUpdated = false;

    // Step 1: Update individual NFTs on-chain (if NFT_OBJECT_IDS provided)
    if (NFT_OBJECT_IDS.length > 0) {
      console.log(`📦 Updating ${NFT_OBJECT_IDS.length} NFT(s) on-chain...\n`);
      for (const nftId of NFT_OBJECT_IDS) {
        const trimmedId = nftId.trim();
        if (trimmedId) {
          const success = await updateNFTOnChain(trimmedId);
          if (success) {
            nftsUpdated++;
          }
          // Small delay between updates
          if (NFT_OBJECT_IDS.indexOf(nftId) < NFT_OBJECT_IDS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      console.log(`\n✅ Updated ${nftsUpdated} NFT(s) on-chain\n`);
    } else {
      console.log('ℹ️  No NFT object IDs provided. Skipping individual NFT updates.');
      console.log('   To update specific NFTs, set NFT_OBJECT_IDS environment variable:');
      console.log('   export NFT_OBJECT_IDS="0x...,0x...,0x..."\n');
    }

    // Step 2: Find and update display object
    const displayId = await findDisplayObject();
    
    if (!displayId) {
      console.log('⚠️  Display object not found automatically.');
      console.log('💡 To find the display object ID:');
      console.log('   1. Go to Sui Explorer and search for your package');
      console.log('   2. Look for Display objects with type containing "AstonManni"');
      console.log('   3. Or set DISPLAY_ID environment variable: export DISPLAY_ID=0x...');
      console.log('   4. Or set ASTONMANNI_DISPLAY_ID environment variable');
      console.log('\n   Skipping display update for now.\n');
    } else {
      // Update display on-chain
      displayUpdated = await updateDisplayOnChain(displayId);
      if (!displayUpdated) {
        console.log('⚠️  Failed to update display on-chain.\n');
      }
    }

    // Step 3: Update database
    await updateDatabase();

    console.log('\n✅ All updates completed!');
    console.log('\n📝 Summary:');
    console.log(`   - NFTs updated on-chain: ${nftsUpdated}`);
    console.log(`   - Display updated on-chain: ${displayUpdated ? 'Yes' : 'No'}`);
    console.log(`   - Database records updated: Yes`);
    console.log(`   - New image URL: ${NEW_IMAGE_URL}`);
    console.log('\n💡 Note: If you updated individual NFTs, their image_url fields are now set.');
    console.log('   If you updated the display, all AstonManni NFTs will show the new image.');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

