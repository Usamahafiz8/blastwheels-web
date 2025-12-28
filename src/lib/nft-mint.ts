import { Transaction } from '@mysten/sui/transactions';

export const NFT_PACKAGE_ID = '0xc9c2874f06b387532b935c325c88e87fd64c7fe0a7bc0edaa60cf3cc3953e340';
export const NFT_MODULE = 'blastwheelz';
export const COLLECTION_ID = '0x819898fdca97f6fb595f3808dcaf9a7b4703cdf0416871f4d8c3f8b1adeb6b94';
// Note: This should be the TransferPolicy object ID, not the TransferPolicyCap
// The mint function requires &mut TransferPolicy<NFT<T>>, not the cap
export const TRANSFER_POLICY_ID = '0x88f0b7cc96ed6e7ac15f3cd9728f5b0dc410454aea23d62d54c10e7ae2cab157';

// Map car names to Move contract types
export function getCarTypeFromName(carName: string): string {
  const name = carName.toLowerCase();
  
  // Map car names to Move contract types
  if (name.includes('mustang')) return 'Mustang';
  if (name.includes('camaro')) return 'Camaro';
  if (name.includes('corvette')) return 'Corvette';
  if (name.includes('charger')) return 'Charger';
  if (name.includes('challenger')) return 'Challenger';
  if (name.includes('viper')) return 'Viper';
  if (name.includes('supra')) return 'Supra';
  if (name.includes('gtr') || name.includes('gt-r')) return 'GTR';
  if (name.includes('nsx')) return 'NSX';
  if (name.includes('rx7') || name.includes('rx-7')) return 'RX7';
  if (name.includes('skyline')) return 'Skyline';
  if (name.includes('silvia')) return 'Silvia';
  if (name.includes('evo')) return 'Evo';
  if (name.includes('sti')) return 'STI';
  if (name.includes('m3')) return 'M3';
  if (name.includes('m5')) return 'M5';
  if (name.includes('rs6') || name.includes('rs-6')) return 'RS6';
  if (name.includes('amg')) return 'AMG';
  if (name.includes('gt3')) return 'GT3';
  if (name.includes('porsche') && name.includes('911')) return 'Porsche911';
  if (name.includes('cayenne')) return 'Cayenne';
  if (name.includes('macan')) return 'Macan';
  if (name.includes('panamera')) return 'Panamera';
  if (name.includes('taycan')) return 'Taycan';
  if (name.includes('model s')) return 'ModelS';
  if (name.includes('model 3') || name.includes('model3')) return 'Model3';
  if (name.includes('roadster')) return 'Roadster';
  if (name.includes('cybertruck')) return 'Cybertruck';
  if (name.includes('f150') || name.includes('f-150')) return 'F150';
  if (name.includes('silverado')) return 'Silverado';
  
  // Default to Mustang if no match
  return 'Mustang';
}

/**
 * Build a mint transaction for an NFT
 * Note: This requires collectionId and transferPolicyId which must be created first
 */
export function buildMintTransaction(params: {
  carType: string;
  collectionId: string;
  transferPolicyId: string;
  name: string;
  imageUrl: string;
  projectUrl: string;
  alloyRim: string;
  frontBonnet: string;
  backBonnet: string;
  ownerAddress: string;
}): Transaction {
  const tx = new Transaction();
  
  // For now, hardcode Mustang as car type
  const carType = 'Mustang';
  const functionName = 'mint';
  
  // Build the type argument for the generic function
  // Format: PACKAGE_ID::MODULE::TYPE
  const typeArgument = `${NFT_PACKAGE_ID}::${NFT_MODULE}::${carType}`;
  
  // Get the collection object (mutable reference)
  const collectionArg = tx.object(params.collectionId);
  
  // Get the transfer policy object (mutable reference)
  // Note: This must be the TransferPolicy object, not the TransferPolicyCap
  // The mint function signature requires: policy: &mut TransferPolicy<NFT<T>>
  const policyArg = tx.object(params.transferPolicyId);
  
  // Call the mint function using typeArguments (correct way for generic functions)
  // The mint function:
  // 1. Creates a new kiosk
  // 2. Mints the NFT
  // 3. Locks the NFT in the kiosk with transfer policy
  // 4. Shares the kiosk (makes it accessible by marketplaces)
  // 5. Returns KioskOwnerCap
  const kioskCap = tx.moveCall({
    target: `${NFT_PACKAGE_ID}::${NFT_MODULE}::${functionName}`,
    typeArguments: [typeArgument],
    arguments: [
      collectionArg,
      policyArg,
      tx.pure.string(params.name),
      tx.pure.string(params.imageUrl),
      tx.pure.string(params.projectUrl),
      tx.pure.string(params.alloyRim),
      tx.pure.string(params.frontBonnet),
      tx.pure.string(params.backBonnet),
    ],
  });
  
  // Transfer the returned KioskOwnerCap to the transaction sender
  // The kiosk itself is shared automatically by the mint function
  tx.transferObjects([kioskCap], params.ownerAddress);
  
  // Set gas budget: 100,000,000 MIST = 0.1 SUI
  // This transaction creates a kiosk, mints an NFT, and locks it
  // Reduced from 0.15 SUI to ensure it works with lower balances
  tx.setGasBudget(100000000);
  
  return tx;
}

/**
 * Get transfer policy ID for a car type
 * Note: Transfer policies are created during package initialization
 * You'll need to provide the policy object ID
 */
export function getTransferPolicyType(carType: string): string {
  const type = getCarTypeFromName(carType);
  return `${NFT_PACKAGE_ID}::blastwheelz::NFT<${type}>`;
}

