/**
 * Collection Mapping
 * Maps car types to their corresponding collection IDs
 * Each car type has its own unique collection created for tracking minted NFTs
 */

// Collection IDs mapped by car type
// These are extracted from collection-results.json after creating collections
const COLLECTION_MAP: Record<string, string> = {
  // Car types from the Move contract with their collection IDs (supply: 100 each)
  'HeBoomanator': process.env.COLLECTION_HEBOOMANATOR || '0x108e85ce354c67e228c23f72da47e9f67e83df899fdf6b8c6b68085a9d0db95b',
  'SuipremeSupra': process.env.COLLECTION_SUIPREMESUPRA || '0x0e7e15bc01a2f82f4815335483228c1badb6d5ab5432c7a5f7b209add7a1ecaa',
  'GoldenToiletGT': process.env.COLLECTION_GOLDENTOILETGT || '0xee66f51e691963cae16620c328d9bad227851cd1d3086473a20bad36156f0aa8',
  'FordFMBP1974': process.env.COLLECTION_FORDFMBP1974 || '0x3b93a9763cdbbaa4327d093627fd8811d973a58ecdc60c20ddf0ff6a7b9ba759',
  'SuiverseRegera': process.env.COLLECTION_SUIVERSEREGERA || '0x3248dfa129f6857b977a644720bb5b06ce6a57d3778cf1aa2607ebf029777931',
  'AquaGTR': process.env.COLLECTION_AQUAGTR || '0xff1ff93fee732724a7864b66bd13bfbff61658219f5acac8fa91e6e22acf68ce',
  'SkelSuiEnergyGT25': process.env.COLLECTION_SKELSUIENERGYGT25 || '0x769e04020dea2b88115d1cbc521918d42ac5dcbee8afe4b9eb6040f659783b68',
  'MercedesBuildersG550': process.env.COLLECTION_MERCEDESBUILDERSG550 || '0xbb0150c32b2a8395f8f4bd718ad28bb40b355aaa63dfbb5d69f39be705ab6387',
  'ArkLiveCyberVenture': process.env.COLLECTION_ARKLIVECYBERVENTURE || '0x8b12818a052d6212970190584a6ecec8e349cfebddf7b3dbd589fe4a44a2c61f',
  'AstonManni': process.env.COLLECTION_ASTONMANNI || '0x3d01015a6db59feb73bb202527134ee786ec2b4cd7a97c6702fb8836f484ed8a',
  'Juggernaut': process.env.COLLECTION_JUGGERNAUT || '0xef0830aa9a181503a97976246e822d3294c2a0514a12c5e5fb827e733eb2532e',
  'NightViper': process.env.COLLECTION_NIGHTVIPER || '0xc2a8b0abaf5f2c9cefc3afe0fcc65a0b47c465b2d2592656496c3a69cfff27c2',
  'BlazeHowler': process.env.COLLECTION_BLAZEHOWLER || '0xbadba7c80bee5c5c07b759c1e405a92b16fbc6bd2c9b506b2c7c42bdcbdf6bf6',
  'CrimsonPhantom': process.env.COLLECTION_CRIMSONPHANTOM || '0x34184899d03e55650a409984948610c32f752b4e20ec91d91c161407da1030de',
  'IronNomad': process.env.COLLECTION_IRONNOMAD || '0xf709144498fd597276ebee182349df869748f819b5fda2c1139d72853c4e490e',
  'NeonFang': process.env.COLLECTION_NEONFANG || '0xa31f43858b690a95133e9fa2d190f7a118a97798f0f1c8bc4a48cef7988af2bb',
  'RedlineReaper': process.env.COLLECTION_REDLINEREAPER || '0x735920412c69cbb314bea9208ac833eb73a786a17a9489d2c2878d86a73dfcb0',
  'BlueRupture': process.env.COLLECTION_BLUERUPTURE || '0x0412e87a7fccd9a505e801890286e8205104e213ce3cdadd4485dc31fbaffe18',
  'VenomCircuit': process.env.COLLECTION_VENOMCIRCUIT || '0x6334585b76df3d58c93025662bfefc434020ecc7030e17b2a04fb000d5d8a264',
  'UltraPulse': process.env.COLLECTION_ULTRAPULSE || '0x027df3fb3c09fdba2b27b49eb9b99304f1d2b067d5cbbf2f8e4602541206a984',
  'ScarletDominion': process.env.COLLECTION_SCARLETDOMINION || '0x7744962c4a11754eec2c2467a8ca85159ae7cff13d77ff3eb629209c22d0a130',
  'SolarDrift': process.env.COLLECTION_SOLARDRIFT || '0xbb3907953a9309224223db00d2fa6a9506dbccd2a45373cdf5b4d41c21f8ff2c',
  'AzureStrike': process.env.COLLECTION_AZURESTRIKE || '0x798f29acaea65820957000e7ccc9f2ac9961aa56c1cb5fb7157a665b25d9a659',
  'BloodApex': process.env.COLLECTION_BLOODAPEX || '0x0f82274de76b09df98885230b9d28fda7f7f814b2a64910787e0bf9b5842e6a2',
  'VelocityWarden': process.env.COLLECTION_VELOCITYWARDEN || '0x862f6d4d32b26c2e3d988073814eb23696662d0122d4905458f576b76a3b3fbd',
  'ToxicSurge': process.env.COLLECTION_TOXICSURGE || '0x77606cf7787343dd43751bbbbd1738a3547609b477aaa38656424ceb6fffacdd',
  'GoldenRevenant': process.env.COLLECTION_GOLDENREVENANT || '0x91a729ea232b14a371a20b9940b9a8cb6b3551200fb0c69de7957930e61cbee1',
  'MidnightBrawler': process.env.COLLECTION_MIDNIGHTBRAWLER || '0x99603f3436263077b417aa1404f286354ff25094cba790cc5e92f263df9e709a',
  'PhantomVector': process.env.COLLECTION_PHANTOMVECTOR || '0x537b4d89251c06f6d5d0a41d36362f2bfab2ded15942223431540dde42f5eb30',
  'EmeraldHavoc': process.env.COLLECTION_EMERALDHAVOC || '0xcd4ccc2944b15727358c557b81e1336b4bd36f1b2c680fbdfb0705e3a282253b',
  'HyperDune': process.env.COLLECTION_HYPERDUNE || '0xf24136e10142d199101e59f9e00cea71cbdd92d0ce263c1eb1f639c04906e2f0',
};

/**
 * Get collection ID for a specific car type
 * @param carType - The car type name (e.g., 'AquaGTR', 'HeBoomanator')
 * @returns The collection object ID for that car type
 */
export function getCollectionId(carType: string): string {
  const collectionId = COLLECTION_MAP[carType];
  
  if (!collectionId) {
    throw new Error(
      `Collection not found for car type: ${carType}. ` +
      `Available car types: ${Object.keys(COLLECTION_MAP).join(', ')}`
    );
  }
  
  return collectionId;
}

/**
 * Get all available car types with collections
 */
export function getAvailableCarTypesWithCollections(): string[] {
  return Object.keys(COLLECTION_MAP);
}

/**
 * Check if a car type has a collection
 */
export function hasCollection(carType: string): boolean {
  return carType in COLLECTION_MAP;
}

