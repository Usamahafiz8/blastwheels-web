import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create or get Prisma client instance
// In development, we check if the cached instance has new models
let prismaInstance = globalForPrisma.prisma;

if (process.env.NODE_ENV === 'development' && prismaInstance) {
  // Runtime check: verify new models exist in cached instance
  try {
    // @ts-ignore - Runtime check for new models that may not be in TypeScript types yet
    if (!prismaInstance.marketplaceItem || !prismaInstance.leaderboardEntry) {
      // Old Prisma client missing new models, create fresh one
      console.log('🔄 Creating fresh Prisma client with new models...');
      prismaInstance.$disconnect().catch(() => {});
      prismaInstance = undefined;
      globalForPrisma.prisma = undefined;
    }
  } catch (e) {
    // If check fails, create fresh instance
    prismaInstance = undefined;
    globalForPrisma.prisma = undefined;
  }
}

// Create new instance if needed
if (!prismaInstance) {
  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;

