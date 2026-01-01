/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAstonArkPrices() {
  try {
    // Set the new price here (in blastwheelz)
    // Note: Prices are stored as numbers (e.g., 500000 = 500,000 blastwheelz)
    const newPrice = 500000; // Premium price
    
    const carsToUpdate = [
      'The Aston Manni',
      'The Ark Live CyberVenture'
    ];
    
    console.log(`Updating prices for ${carsToUpdate.length} cars to ${newPrice} blastwheelz...\n`);
    
    for (const carName of carsToUpdate) {
      const items = await prisma.marketplaceItem.findMany({
        where: { name: carName },
      });
      
      if (items.length > 0) {
        for (const item of items) {
          const oldPrice = item.price;
          await prisma.marketplaceItem.update({
            where: { id: item.id },
            data: { price: newPrice },
          });
          console.log(`  ✓ ${item.name}: ${oldPrice} → ${newPrice} blastwheelz`);
        }
      } else {
        console.log(`  ✗ ${carName}: Not found`);
      }
    }
    
    console.log(`\n✓ Price updates completed!`);
  } catch (error) {
    console.error('Error updating car prices:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateAstonArkPrices();

