/**
 * Admin API endpoint to share all NFT collections on-chain
 * This makes collections accessible to users for minting NFTs with their own wallets
 * 
 * @swagger
 * /api/admin/share-collections:
 *   post:
 *     summary: Share all NFT collections on-chain
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Collections shared successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { getCollectionId, getAvailableCarTypesWithCollections } from '@/lib/collection-map';
import { SUI_CONFIG } from '@/lib/sui';

// Configuration
const network = (process.env.SUI_NETWORK || 'mainnet') as 'mainnet' | 'devnet' | 'localnet';
const rpcUrl = process.env.SUI_RPC_URL || getFullnodeUrl(network);
const client = new SuiClient({ url: rpcUrl });

// Admin keypair
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || '';
const adminMnemonic = process.env.ADMIN_MNEMONIC || '';

function getAdminKeypair(): Ed25519Keypair | null {
  if (adminMnemonic) {
    return Ed25519Keypair.deriveKeypair(adminMnemonic);
  }
  
  if (adminPrivateKey) {
    try {
      if (adminPrivateKey.startsWith('suiprivkey')) {
        const { secretKey } = decodeSuiPrivateKey(adminPrivateKey.trim());
        return Ed25519Keypair.fromSecretKey(secretKey);
      }
      
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
      console.error('Failed to create admin keypair:', error);
      return null;
    }
  }
  
  return null;
}

async function isObjectShared(objectId: string): Promise<boolean> {
  try {
    const obj = await client.getObject({
      id: objectId,
      options: { showOwner: true },
    });
    
    if (!obj.data?.owner) {
      return false;
    }
    
    // Check if owner is an object (not a string) and has 'Shared' property
    const owner = obj.data.owner;
    if (typeof owner === 'string') {
      return false;
    }
    
    // Type assertion: owner is an object at this point
    const ownerObj = owner as Record<string, unknown>;
    return ownerObj !== null && 'Shared' in ownerObj;
  } catch (error) {
    return false;
  }
}

async function shareCollection(collectionId: string, carType: string, adminKeypair: Ed25519Keypair): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Check if already shared
    const alreadyShared = await isObjectShared(collectionId);
    if (alreadyShared) {
      return { success: true };
    }

    // Create transaction to share the collection
    const tx = new Transaction();
    
    tx.moveCall({
      target: '0x2::transfer::share_object',
      typeArguments: [],
      arguments: [tx.object(collectionId)],
    });

    tx.setGasBudget(100000000); // 0.1 SUI

    const result = await client.signAndExecuteTransaction({
      signer: adminKeypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (result.effects?.status.status !== 'success') {
      return {
        success: false,
        error: `Transaction failed: ${result.effects?.status.error || 'Unknown error'}`,
      };
    }

    // Verify it's now shared
    const isShared = await isObjectShared(collectionId);
    
    return {
      success: isShared,
      txHash: result.digest,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to share collection',
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require admin role
    await requireRole(req, 'ADMIN');

    // Check if admin keypair is available
    const adminKeypair = getAdminKeypair();
    if (!adminKeypair) {
      return NextResponse.json(
        { error: 'Admin credentials not configured. Please set ADMIN_PRIVATE_KEY or ADMIN_MNEMONIC in environment variables.' },
        { status: 500 }
      );
    }

    const carTypes = getAvailableCarTypesWithCollections();
    const results: Array<{ carType: string; success: boolean; txHash?: string; error?: string; alreadyShared?: boolean }> = [];

    // Share each collection
    for (const carType of carTypes) {
      try {
        const collectionId = getCollectionId(carType);
        const alreadyShared = await isObjectShared(collectionId);
        
        if (alreadyShared) {
          results.push({ carType, success: true, alreadyShared: true });
        } else {
          const result = await shareCollection(collectionId, carType, adminKeypair);
          results.push({ carType, ...result });
          
          // Small delay between transactions
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        results.push({
          carType,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const alreadyShared = results.filter(r => r.alreadyShared).length;

    return NextResponse.json({
      message: 'Collection sharing completed',
      summary: {
        total: results.length,
        successful,
        failed,
        alreadyShared,
      },
      results,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.error('Share collections error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

