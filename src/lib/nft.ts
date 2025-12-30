import { suiClient } from './sui';

/**
 * Verify an NFT purchase transaction
 * Checks that the NFT was transferred from seller to buyer
 */
export async function verifyNFTPurchaseTransaction(
  txHash: string,
  nftObjectId: string,
  buyerAddress: string
): Promise<boolean> {
  try {
    const tx = await suiClient.getTransactionBlock({
      digest: txHash,
      options: {
        showEffects: true,
        showInput: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      },
    });

    // Verify transaction is successful
    if (tx.effects?.status?.status !== 'success') {
      console.error('Transaction failed:', tx.effects?.status);
      return false;
    }

    // Check object changes to find NFT transfer
    const objectChanges = tx.objectChanges || [];
    
    // Look for the NFT being transferred to the buyer
    const nftTransfer = objectChanges.find((change: any) => {
      // Check if this is the NFT object being transferred
      if (change.type === 'transferred' || change.type === 'mutated') {
        const objectId = change.objectId || change.object?.objectId;
        if (objectId === nftObjectId) {
          // Check if recipient is the buyer
          const recipient = change.recipient?.AddressOwner || change.owner?.AddressOwner;
          return recipient?.toLowerCase() === buyerAddress.toLowerCase();
        }
      }
      return false;
    });

    if (!nftTransfer) {
      // Also check if NFT was transferred via published object (kiosk purchases)
      // In kiosk purchases, the NFT might be published as a shared object
      const publishedObject = objectChanges.find((change: any) => {
        if (change.type === 'published' || change.type === 'created') {
          const objectId = change.objectId;
          return objectId === nftObjectId;
        }
        return false;
      });

      if (publishedObject) {
        // For kiosk purchases, check if buyer's address appears in effects
        const effects = tx.effects;
        if (effects?.created) {
          const created = Array.isArray(effects.created) ? effects.created : [effects.created];
          const nftCreated = created.find((obj: any) => 
            obj.owner?.AddressOwner?.toLowerCase() === buyerAddress.toLowerCase() ||
            obj.reference?.objectId === nftObjectId
          );
          if (nftCreated) return true;
        }
      }

      console.error('NFT transfer not found in transaction');
      return false;
    }

    return true;
  } catch (error) {
    console.error('NFT purchase verification error:', error);
    return false;
  }
}

/**
 * Get current owner of an NFT from on-chain data
 */
export async function getNFTOwner(nftObjectId: string): Promise<string | null> {
  try {
    const object = await suiClient.getObject({
      id: nftObjectId,
      options: {
        showOwner: true,
        showContent: true,
      },
    });

    if (object.data?.owner) {
      const owner = object.data.owner as any;
      if (owner && typeof owner === 'object' && 'AddressOwner' in owner) {
        return owner.AddressOwner;
      }
      // Handle other owner types (shared object, immutable, etc.)
      if (owner && typeof owner === 'object' && 'ObjectOwner' in owner) {
        return owner.ObjectOwner;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching NFT owner:', error);
    return null;
  }
}

