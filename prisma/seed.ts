import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000000' },
    update: {},
    create: {
      walletAddress: '0x0000000000000000000000000000000000000000000000000000000000000000',
      username: 'admin',
      email: 'admin@blastwheels.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      playerStats: {
        create: {
          totalGames: 0,
          wins: 0,
          losses: 0,
          rank: 0,
          level: 1,
        },
      },
    },
  });

  console.log('✅ Created admin user:', admin.username);

  // Create sample player
  const player = await prisma.user.upsert({
    where: { walletAddress: '0x1111111111111111111111111111111111111111111111111111111111111111' },
    update: {},
    create: {
      walletAddress: '0x1111111111111111111111111111111111111111111111111111111111111111',
      username: 'player1',
      email: 'player1@example.com',
      role: 'PLAYER',
      playerStats: {
        create: {
          totalGames: 5,
          wins: 3,
          losses: 2,
          totalEarnings: '1000.5',
          totalSpent: '500.0',
          rank: 1,
          level: 5,
          experience: 2500,
        },
      },
    },
  });

  console.log('✅ Created sample player:', player.username);

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

