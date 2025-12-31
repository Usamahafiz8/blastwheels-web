import { Transaction } from '@mysten/sui/transactions';
import { SUI_CONFIG } from './sui';

// Use environment variable or fallback to SUI_CONFIG
export const NFT_PACKAGE_ID = process.env.NFT_PACKAGE_ID || SUI_CONFIG.nftPackageId;
export const NFT_MODULE = 'blastwheelz';

// Note: These are deprecated - use getCollectionId() and getTransferPolicyId() instead
// Keeping for backward compatibility but they should not be used
export const COLLECTION_ID = '0x819898fdca97f6fb595f3808dcaf9a7b4703cdf0416871f4d8c3f8b1adeb6b94';
// Note: This should be the TransferPolicy object ID, not the TransferPolicyCap
// The mint function requires &mut TransferPolicy<NFT<T>>, not the cap
export const TRANSFER_POLICY_ID = '0x88f0b7cc96ed6e7ac15f3cd9728f5b0dc410454aea23d62d54c10e7ae2cab157';

// Map car names to Move contract types
// These are the actual car types defined in the Move contract
export function getCarTypeFromName(carName: string): string {
  const name = carName.toLowerCase();
  
  // Map car names to actual Move contract types
  if (name.includes('boomanator') || name.includes('boom')) return 'HeBoomanator';
  if (name.includes('suipreme') || name.includes('supra')) return 'SuipremeSupra';
  if (name.includes('golden toilet') || name.includes('toilet')) return 'GoldenToiletGT';
  if (name.includes('ford') && (name.includes('mbp') || name.includes('f-mbp'))) return 'FordFMBP1974';
  if (name.includes('suiverse') || name.includes('regera')) return 'SuiverseRegera';
  if (name.includes('aqua') || name.includes('gtr') || name.includes('gt-r')) return 'AquaGTR';
  if (name.includes('skel') || name.includes('skel sui')) return 'SkelSuiEnergyGT25';
  if (name.includes('mercedes') || name.includes('builders') || name.includes('g 550')) return 'MercedesBuildersG550';
  if (name.includes('ark') || name.includes('cyberventure') || name.includes('live')) return 'ArkLiveCyberVenture';
  if (name.includes('aston') || name.includes('manni')) return 'AstonManni';
  if (name.includes('juggernaut')) return 'Juggernaut';
  if (name.includes('night') && name.includes('viper')) return 'NightViper';
  if (name.includes('blaze') || name.includes('howler')) return 'BlazeHowler';
  if (name.includes('crimson') || name.includes('phantom')) return 'CrimsonPhantom';
  if (name.includes('iron') || name.includes('nomad')) return 'IronNomad';
  if (name.includes('neon') || name.includes('fang')) return 'NeonFang';
  if (name.includes('redline') || name.includes('reaper')) return 'RedlineReaper';
  if (name.includes('blue') || name.includes('rupture')) return 'BlueRupture';
  if (name.includes('venom') || name.includes('circuit')) return 'VenomCircuit';
  if (name.includes('ultra') || name.includes('pulse')) return 'UltraPulse';
  if (name.includes('scarlet') || name.includes('dominion')) return 'ScarletDominion';
  if (name.includes('solar') || name.includes('drift')) return 'SolarDrift';
  if (name.includes('azure') || name.includes('strike')) return 'AzureStrike';
  if (name.includes('blood') || name.includes('apex')) return 'BloodApex';
  if (name.includes('velocity') || name.includes('warden')) return 'VelocityWarden';
  if (name.includes('toxic') || name.includes('surge')) return 'ToxicSurge';
  if (name.includes('golden') && name.includes('revenant')) return 'GoldenRevenant';
  if (name.includes('midnight') || name.includes('brawler')) return 'MidnightBrawler';
  if (name.includes('phantom') && name.includes('vector')) return 'PhantomVector';
  if (name.includes('emerald') || name.includes('havoc')) return 'EmeraldHavoc';
  if (name.includes('hyper') || name.includes('dune')) return 'HyperDune';
  
  // Default to HeBoomanator if no match (first car type)
  return 'HeBoomanator';
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

