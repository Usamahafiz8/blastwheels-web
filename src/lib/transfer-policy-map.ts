/**
 * Transfer Policy Mapping
 * Maps car types to their corresponding transfer policy IDs
 * Each car type has its own unique transfer policy created during package initialization
 */

// Transfer policy IDs mapped by car type
// These are extracted from package_objects.json after package deployment
const TRANSFER_POLICY_MAP: Record<string, string> = {
  // Car types from the Move contract
  'HeBoomanator': process.env.TRANSFER_POLICY_HEBOOMANATOR || '0x8a3e87d9148a92fbaf901c08a0372bd6c4936e8bad5e2e93ec9a1706b9531d71',
  'SuipremeSupra': process.env.TRANSFER_POLICY_SUIPREMESUPRA || '0x23268ce0871f8062336b3e443f8e8467ed4e893f26427a88b79ff4ab52b1bbfc',
  'GoldenToiletGT': process.env.TRANSFER_POLICY_GOLDENTOILETGT || '0xfd9d41db7db868def0af70b7fa273eb98b172d3908c4aade378fc9e1857f44ae',
  'FordFMBP1974': process.env.TRANSFER_POLICY_FORDFMBP1974 || '0xf138e1a26620f405f2fb5c5a03cd63b4f003d4561faa0a072a8f6e8dbbd43084',
  'SuiverseRegera': process.env.TRANSFER_POLICY_SUIVERSEREGERA || '0xffed08d1395d11ba05c6d473606fea3051721455ce07af9596b4d810006100ac',
  'AquaGTR': process.env.TRANSFER_POLICY_AQUAGTR || '0x164c004347e290c8c1496a499c9e2e3408a964d0f4460ac566544dbd62d4f928',
  'SkelSuiEnergyGT25': process.env.TRANSFER_POLICY_SKELSUIENERGYGT25 || '0x4dd18c68cbd4d742aa670576a719634180c12379ce2d64d99e9da98ca17b9848',
  'MercedesBuildersG550': process.env.TRANSFER_POLICY_MERCEDESBUILDERSG550 || '0x326494bf5c124b4fabd7f762df31736a24dd6e10152ef106699d159e57625a83',
  'ArkLiveCyberVenture': process.env.TRANSFER_POLICY_ARKLIVECYBERVENTURE || '0x7e4fc494d5576c173191d11c137ed274af9f96a70f8fbe12c666b7e0747dc21d',
  'AstonManni': process.env.TRANSFER_POLICY_ASTONMANNI || '0xe856c9fd7df1160028fc5d774120872fdc455ea1a1c9db0382f46759acea24f1',
  'Juggernaut': process.env.TRANSFER_POLICY_JUGGERNAUT || '0x0dd12e5973e2d0c342a17ef037b24fb80133637ad7ef9c484e451b78f407678e',
  'NightViper': process.env.TRANSFER_POLICY_NIGHTVIPER || '0x830356e38d8e7972e2113458a784f0b7374a37621fce9cdd0f3ac15a2fa9e8a4',
  'BlazeHowler': process.env.TRANSFER_POLICY_BLAZEHOWLER || '0xa3b652c1fa91547d86b9fe4216a8321aff01758a5b40442a61762ab3b3711f88',
  'CrimsonPhantom': process.env.TRANSFER_POLICY_CRIMSONPHANTOM || '0x5887c7f226193c187059a223ae45c7a3b531011fb38bb771b8e59ee312554279',
  'IronNomad': process.env.TRANSFER_POLICY_IRONNOMAD || '0x59bf65f8e25e8854c4f21475290a5c3d8ad5fcd2f37524bc1ac7c518aeccb546',
  'NeonFang': process.env.TRANSFER_POLICY_NEONFANG || '0x83f5d6e9ceed239f992751a62f9a13d63a5ac522ea221b1781b54156d3dbbc53',
  'RedlineReaper': process.env.TRANSFER_POLICY_REDLINEREAPER || '0xff66fac0c1f7174f97068e7a91b39bc57da9c62cdd7832ee9c0b0b5b21d3c912',
  'BlueRupture': process.env.TRANSFER_POLICY_BLUERUPTURE || '0x7520c533a12927ac6f5943c9c9595e062257179499e7ae5fbcec750df978d79b',
  'VenomCircuit': process.env.TRANSFER_POLICY_VENOMCIRCUIT || '0x2c6572b431ddd30ec287f374dc5e11be1dceb1590773eb1d118e5c1ab81b9f73',
  'UltraPulse': process.env.TRANSFER_POLICY_ULTRAPULSE || '0x68b0bc979c11e302aff079f21d9b89b438fdcb7bfeaa09348543cea0fcb7b5cf',
  'ScarletDominion': process.env.TRANSFER_POLICY_SCARLETDOMINION || '0xd71a0d92f26800f351dbfb3046f31998376208e7beb1fbbf2f1b54d5ccb97ee9',
  'SolarDrift': process.env.TRANSFER_POLICY_SOLARDRIFT || '0x33c7dd6da461c719d58d23a33fbeb05781c4733444b9920b2e9b8c1c83af560f',
  'AzureStrike': process.env.TRANSFER_POLICY_AZURESTRIKE || '0x7e475fa4b6ad19b7e1582e63909c201423c1cfe138f8c10f4af0bbc60abea418',
  'BloodApex': process.env.TRANSFER_POLICY_BLOODAPEX || '0xc015f8302f6c617b8707bd0e0442d96545cfae82bf8df986226390ab712c82ed',
  'VelocityWarden': process.env.TRANSFER_POLICY_VELOCITYWARDEN || '0x88c0839c8863775897239cc0ce7a386c2a8e5cb207a4bf184c96f1b41bdf60d4',
  'ToxicSurge': process.env.TRANSFER_POLICY_TOXICSURGE || '0xa080d2fcb496cb6722525f92e1fe004966011561f482e9b348485f7d2fed7555',
  'GoldenRevenant': process.env.TRANSFER_POLICY_GOLDENREVENANT || '0xc1c01ec5acce0e851bcaaffb84107c00f86f224919b5b8107b3beb30ae9ee9e1',
  'MidnightBrawler': process.env.TRANSFER_POLICY_MIDNIGHTBRAWLER || '0x21135468851b946b90ac5e5be2cbc824253d030f83b41b487d88b5c0f8d85e12',
  'PhantomVector': process.env.TRANSFER_POLICY_PHANTOMVECTOR || '0xdbdf12fee84a84b43bd169a9330817bbbbc910101cf56f5f6d417166bc84c92d',
  'EmeraldHavoc': process.env.TRANSFER_POLICY_EMERALDHAVOC || '0xa270d6db000300be9f6bc4da1687993c468fedd359b5a780211782f13dd2053b',
  'HyperDune': process.env.TRANSFER_POLICY_HYPERDUNE || '0x43214e9a4280dc05e2768d861de8a4b539818e76c0ce6ea00aa1e87030e9d9c8',
};

/**
 * Get transfer policy ID for a specific car type
 * @param carType - The car type name (e.g., 'AquaGTR', 'HeBoomanator')
 * @returns The transfer policy object ID for that car type
 */
export function getTransferPolicyId(carType: string): string {
  const policyId = TRANSFER_POLICY_MAP[carType];
  
  if (!policyId) {
    throw new Error(
      `Transfer policy not found for car type: ${carType}. ` +
      `Available car types: ${Object.keys(TRANSFER_POLICY_MAP).join(', ')}`
    );
  }
  
  return policyId;
}

/**
 * Get all available car types
 */
export function getAvailableCarTypes(): string[] {
  return Object.keys(TRANSFER_POLICY_MAP);
}

/**
 * Check if a car type has a transfer policy
 */
export function hasTransferPolicy(carType: string): boolean {
  return carType in TRANSFER_POLICY_MAP;
}

