/**
 * Mint NFT Script
 * 
 * This script mints an NFT directly into a new kiosk with the transfer policy attached.
 * The mint function signature:
 *   mint<T>(
 *     collection: &mut Collection<T>,
 *     policy: &mut TransferPolicy<NFT<T>>,
 *     name: String,
 *     image_url: String,
 *     project_url: String,
 *     rim: String,
 *     texture: String,
 *     speed: String,
 *     brake: String,
 *     control: String,
 *     ctx: &mut TxContext
 *   ): KioskOwnerCap
 * 
 * Required Environment Variables:
 *   - PACKAGE_ID: The package ID of the deployed contract
 *   - COLLECTION_ID: The collection object ID (create via create_collection.ts)
 *   - TRANSFER_POLICY_ID: The transfer policy object ID (created during package init)
 *   - MNEMONIC or PRIVATE_KEY: Wallet credentials for signing transactions
 * 
 * Optional Environment Variables:
 *   - SUI_NETWORK: Network URL (defaults to mainnet)
 *   - BLASTWHEELZ_TYPE: NFT type (defaults to PACKAGE_ID::blastwheelz::AquaGTR)
 */

import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { 
    SUI_NETWORK, 
    MNEMONIC, 
    PRIVATE_KEY, 
    PACKAGE_ID, 
    COLLECTION_ID, 
    TRANSFER_POLICY_ID
} from '../config';

const mnemonic = MNEMONIC;
const privateKey = PRIVATE_KEY;
const packageId = PACKAGE_ID;
const suiNetwork = SUI_NETWORK;
const collectionId = COLLECTION_ID;
const transferPolicyId = TRANSFER_POLICY_ID;
// Default to AquaGTR if not specified
const blastwheelzTypeArg = process.env.BLASTWHEELZ_TYPE || `${packageId}::blastwheelz::AquaGTR`;

async function mintNFT(
    name: string,
    imageUrl: string,
    projectUrl: string,
    rim: string,
    texture: string,
    speed: string,
    brake: string,
    control: string
): Promise<any> {
    try {
        // Validate required environment variables
        if (!mnemonic && !privateKey) {
            throw new Error('❌ MNEMONIC or PRIVATE_KEY must be set in .env file');
        }
        if (!packageId) {
            throw new Error('❌ PACKAGE_ID not set in .env file. Set it to your deployed package ID');
        }
        if (!collectionId) {
            throw new Error('❌ COLLECTION_ID not set in .env file.\n   Run: npm run create_collection\n   Or set COLLECTION_ID in .env');
        }
        if (!transferPolicyId) {
            throw new Error('❌ TRANSFER_POLICY_ID not set in .env file.\n   The transfer policy is created during package initialization.\n   Set one of: TRANSFER_POLICY_ID, Transfer_Policy, or TRANSFER_POLICY in .env');
        }

        console.log('📋 Mint Configuration:');
        console.log(`   Package ID: ${packageId}`);
        console.log(`   Collection ID: ${collectionId}`);
        console.log(`   Transfer Policy ID: ${transferPolicyId}`);
        console.log(`   NFT Type: ${blastwheelzTypeArg}`);
        console.log(`   Network: ${suiNetwork}\n`);

        const keypair = mnemonic 
            ? Ed25519Keypair.deriveKeypair(mnemonic)
            : Ed25519Keypair.fromSecretKey(privateKey);
        const client = new SuiClient({ url: suiNetwork });

        // Check wallet balance
        const address = keypair.toSuiAddress();
        const balance = await client.getBalance({ owner: address });
        const balanceSui = parseInt(balance.totalBalance) / 1_000_000_000;
        
        console.log(`💰 Wallet Balance: ${balanceSui} SUI (${balance.totalBalance} MIST)`);
        
        if (parseInt(balance.totalBalance) < 100_000_000) {
            console.warn('⚠️  Warning: Low balance. This transaction requires at least 0.1 SUI for gas.');
        }
        console.log('');

        console.log('🚀 Creating transaction...');
        const tx = new Transaction();
        
        // Call mint function which:
        // 1. Creates a new kiosk
        // 2. Mints the NFT
        // 3. Locks the NFT in the kiosk with transfer policy
        // 4. Shares the kiosk (makes it accessible by marketplaces)
        // 5. Returns KioskOwnerCap
        const kioskCap = tx.moveCall({
            target: `${packageId}::blastwheelz::mint`,
            arguments: [
                tx.object(collectionId),        // collection: &mut Collection<T>
                tx.object(transferPolicyId),     // policy: &mut TransferPolicy<NFT<T>>
                tx.pure.string(name),             // name: String
                tx.pure.string(imageUrl),         // image_url: String
                tx.pure.string(projectUrl),       // project_url: String
                tx.pure.string(rim),              // rim: String
                tx.pure.string(texture),           // texture: String
                tx.pure.string(speed),             // speed: String
                tx.pure.string(brake),             // brake: String
                tx.pure.string(control),           // control: String
            ],
            typeArguments: [blastwheelzTypeArg],  // <T> type argument
        });

        // Transfer the returned kiosk owner cap to the sender
        // Note: The kiosk itself is shared (public), so it's accessible by marketplaces
        tx.transferObjects([kioskCap], keypair.toSuiAddress());

        // Set gas budget: 150,000,000 MIST = 0.15 SUI
        // This transaction creates a kiosk, mints an NFT, and locks it, so it needs more gas
        // Using a higher budget to ensure transaction succeeds
        tx.setGasBudget(150000000);

        console.log('📤 Executing transaction...\n');
        const result = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
            options: {
                showObjectChanges: true,
                showEffects: true,
                showEvents: true,
                showBalanceChanges: true,
                showInput: true,
            },
        });

        // Check transaction status
        if (result.effects?.status.status !== 'success') {
            throw new Error(`Transaction failed: ${result.effects?.status.error || 'Unknown error'}`);
        }

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ TRANSACTION SUCCESSFUL!');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`Transaction Digest: ${result.digest}\n`);

        // Find shared kiosk (shared objects have owner with Shared property)
        const sharedKiosk = result.objectChanges?.find(
            (change: any) => {
                const isKiosk = change.objectType?.includes('kiosk::Kiosk');
                const isShared = change.owner && 'Shared' in change.owner;
                return isKiosk && isShared;
            }
        ) as { type: string; objectId: string; owner?: any } | undefined;

        // Find created kiosk owner cap
        const createdKioskCap = result.objectChanges?.find(
            (change: any) => change.type === 'created' && change.objectType?.includes('kiosk::KioskOwnerCap')
        ) as { type: 'created'; objectId: string } | undefined;

        // Find created NFT (may be in kiosk, so check for created or transferred)
        const createdNFT = result.objectChanges?.find(
            (change: any) => change.type === 'created' && change.objectType?.includes('::blastwheelz::NFT')
        ) as { type: 'created'; objectId: string } | undefined;

        if (createdKioskCap) {
            const kioskId = sharedKiosk?.objectId || 'Check transaction for shared kiosk ID';
            const kioskCapId = createdKioskCap.objectId;
            const nftId = createdNFT?.objectId;
            
            console.log('📦 Created Objects:');
            if (nftId) {
                console.log(`   🎯 NFT Object ID: ${nftId}`);
            }
            if (sharedKiosk) {
                console.log(`   🏪 Shared Kiosk ID: ${kioskId}`);
            } else {
                console.log(`   🏪 Shared Kiosk: Created and shared (check transaction details)`);
            }
            console.log(`   🔑 Kiosk Owner Cap ID: ${kioskCapId}\n`);
            
            console.log('💡 What happened:');
            console.log('   1. A new kiosk was created');
            console.log('   2. An NFT was minted');
            console.log('   3. The NFT was locked in the kiosk with transfer policy attached');
            console.log('   4. The kiosk was shared (accessible by marketplaces like TradePort)');
            console.log('   5. The kiosk owner cap was transferred to your wallet\n');
            
            console.log('✅ Your NFT is now in a SHARED kiosk and can be:');
            console.log('   • Listed on TradePort and other marketplaces');
            console.log('   • Bought by other users');
            console.log('   • Transferred through the kiosk system\n');
            
            if (sharedKiosk) {
                console.log('📝 Optional: Add these to your .env file for future operations:');
                console.log(`   KIOSK_ID=${kioskId}`);
                console.log(`   KIOSK_OWNER_CAP_ID=${kioskCapId}\n`);
            }
            
            console.log('🔗 View on Sui Explorer:');
            console.log(`   https://suiexplorer.com/txblock/${result.digest}?network=${suiNetwork.includes('mainnet') ? 'mainnet' : 'testnet'}\n`);
        } else {
            console.log('⚠️  Warning: Could not find kiosk owner cap in transaction result');
            console.log('   Full result:', JSON.stringify(result, null, 2));
        }

        return result;
    } catch (error: any) {
        console.error('Error minting NFT:', error.message);
        throw error;
    }
}

mintNFT(
    'AquaGTR NFT #1',
    'https://example.com/aquagtr-image.jpg',
    'https://blastwheelz.io',
    'Chrome Alloy Rims',
    'Metallic Blue Texture',
    'High Performance Speed',
    'Carbon Ceramic Brakes',
    'Advanced Control System'
).catch((error) => {
    console.error('Script execution failed:', error.message);
    process.exit(1);
});

