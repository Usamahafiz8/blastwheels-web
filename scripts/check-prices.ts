import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPrices() {
  try {
    const items = await prisma.marketplaceItem.findMany({
      select: { name: true, price: true },
      orderBy: { name: 'asc' },
    });
    
    console.log('Current marketplace prices:\n');
    const highPrice = items.filter(item => Number(item.price) === 500000);
    const normalPrice = items.filter(item => Number(item.price) === 250000);
    
    console.log(`Cars at 500000 (${highPrice.length}):`);
    highPrice.forEach(item => {
      console.log(`  - ${item.name}`);
    });
    
    console.log(`\nCars at 250000 (${normalPrice.length}):`);
    normalPrice.forEach(item => {
      console.log(`  - ${item.name}`);
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrices();

