import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Node.js types are available through @types/node
declare const process: {
  exit: (code?: number) => never;
};

/**
 * Seed car types
 * Note: Car types are managed through NFT collections and marketplace items,
 * not through a separate carType model in the database.
 */
async function main() {
  console.log('🌱 Seeding car types...');
  
  // Car types are managed through:
  // 1. NFT collections on-chain
  // 2. Marketplace items in the database
  // There is no separate carType model in Prisma schema
  
  console.log('✅ Car types are managed through NFT collections and marketplace items');
  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding car types:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
