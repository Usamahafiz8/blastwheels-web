import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCarPrices() {
  try {
    const newPrice = 500000;
    
    console.log(`Updating prices of 10 cars to ${newPrice} blastwheelz...`);
    
    // Get all marketplace items
    const allItems = await prisma.marketplaceItem.findMany({
      orderBy: { createdAt: 'asc' },
    });
    
    console.log(`Found ${allItems.length} total marketplace items`);
    
    // Update first 10 items (or all if less than 10)
    const itemsToUpdate = allItems.slice(0, 10);
    
    if (itemsToUpdate.length === 0) {
      console.log('No marketplace items found to update.');
      return;
    }
    
    console.log(`\nUpdating ${itemsToUpdate.length} items:`);
    
    for (const item of itemsToUpdate) {
      console.log(`  - ${item.name} (current price: ${item.price})`);
      
      await prisma.marketplaceItem.update({
        where: { id: item.id },
        data: { price: newPrice },
      });
      
      console.log(`    ✓ Updated to ${newPrice} blastwheelz`);
    }
    
    console.log(`\n✓ Successfully updated ${itemsToUpdate.length} car prices to ${newPrice} blastwheelz!`);
  } catch (error) {
    console.error('Error updating car prices:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateCarPrices();

