import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const network = (process.env.SUI_NETWORK || 'mainnet') as 'mainnet' | 'devnet' | 'localnet';
const rpcUrl = process.env.SUI_RPC_URL || getFullnodeUrl(network);

export const suiClient = new SuiClient({ url: rpcUrl });

export const SUI_CONFIG = {
  network,
  rpcUrl,
  packageId: process.env.SUI_PACKAGE_ID || '0x6a9c2ded791f1eea4c23ac9bc3dbebf3e5b9f828a9837c9dd62d5e5698aac3ee',
  moduleName: 'wheels',
  coinType: `${process.env.SUI_PACKAGE_ID || '0x6a9c2ded791f1eea4c23ac9bc3dbebf3e5b9f828a9837c9dd62d5e5698aac3ee'}::wheels::WHEELS`,
  // Blastweel token configuration (for purchasing blastwheelz)
  blastweelTokenPackageId: process.env.BLASTWEEL_TOKEN_PACKAGE_ID || process.env.SUI_PACKAGE_ID || '0x6a9c2ded791f1eea4c23ac9bc3dbebf3e5b9f828a9837c9dd62d5e5698aac3ee',
  blastweelTokenModule: process.env.BLASTWEEL_TOKEN_MODULE || 'blastweel',
  blastweelTokenType: process.env.BLASTWEEL_TOKEN_TYPE || `${process.env.BLASTWEEL_TOKEN_PACKAGE_ID || process.env.SUI_PACKAGE_ID || '0x6a9c2ded791f1eea4c23ac9bc3dbebf3e5b9f828a9837c9dd62d5e5698aac3ee'}::${process.env.BLASTWEEL_TOKEN_MODULE || 'blastweel'}::BLASTWEEL`,
  // NFT configuration
  nftPackageId: process.env.NFT_PACKAGE_ID || '0xc9c2874f06b387532b935c325c88e87fd64c7fe0a7bc0edaa60cf3cc3953e340',
  nftModule: 'blastwheelz',
};

