import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestItems() {
  try {
    // Find items by name
    const testItemNames = ['tyghjlkHGJKL', 'sadas'];
    
    console.log('Searching for test items...');
    
    for (const name of testItemNames) {
      const items = await prisma.marketplaceItem.findMany({
        where: {
          name: name,
        },
      });
      
      if (items.length > 0) {
        console.log(`Found ${items.length} item(s) matching "${name}":`);
        for (const item of items) {
          console.log(`  - ID: ${item.id}, Name: ${item.name}, Price: ${item.price}`);
          
          // Delete the item
          await prisma.marketplaceItem.delete({
            where: { id: item.id },
          });
          
          console.log(`  ✓ Deleted item: ${item.name}`);
        }
      } else {
        console.log(`  No items found matching "${name}"`);
      }
    }
    
    console.log('\n✓ Test items deletion completed!');
  } catch (error) {
    console.error('Error deleting test items:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestItems();

