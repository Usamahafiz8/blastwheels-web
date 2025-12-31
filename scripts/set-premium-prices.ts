import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cars that should be priced at 500000
const premiumCars = [
  'HE BOOMANATOR',
  'The Suipreme Supra',
  'The Golden Toilet GT',
  'The 1974 Ford F-MBP',
  'The Suiverse Regera',
  'THE AQUA GT-R',
  'SkelSui: The Skel Energy GT 25',
  'The Mercedes-Builders G 550 4x4',
  'The Ark Live CyberVenture',
  'The Aston Manni'
];

async function setPremiumPrices() {
  try {
    const premiumPrice = 500000;
    const normalPrice = 250000;
    
    console.log('Setting premium car prices...\n');
    
    // Get all marketplace items
    const allItems = await prisma.marketplaceItem.findMany({
      select: { id: true, name: true, price: true },
    });
    
    // Create a set of premium car names (case-insensitive)
    const premiumNamesSet = new Set(premiumCars.map(name => name.toLowerCase()));
    
    let premiumUpdated = 0;
    let normalUpdated = 0;
    
    for (const item of allItems) {
      const itemNameLower = item.name.toLowerCase();
      const isPremium = premiumNamesSet.has(itemNameLower);
      const currentPrice = Number(item.price);
      const targetPrice = isPremium ? premiumPrice : normalPrice;
      
      if (currentPrice !== targetPrice) {
        await prisma.marketplaceItem.update({
          where: { id: item.id },
          data: { price: targetPrice },
        });
        
        if (isPremium) {
          console.log(`  ✓ ${item.name}: ${currentPrice} → ${premiumPrice} blastwheelz (Premium)`);
          premiumUpdated++;
        } else {
          console.log(`  ✓ ${item.name}: ${currentPrice} → ${normalPrice} blastwheelz (Normal)`);
          normalUpdated++;
        }
      } else {
        if (isPremium) {
          console.log(`  - ${item.name}: Already at ${premiumPrice} blastwheelz (Premium)`);
        } else {
          console.log(`  - ${item.name}: Already at ${normalPrice} blastwheelz (Normal)`);
        }
      }
    }
    
    console.log(`\n✓ Price update complete!`);
    console.log(`  Premium cars (500000): ${premiumCars.length}`);
    console.log(`  Normal cars (250000): ${allItems.length - premiumCars.length}`);
    console.log(`  Updated: ${premiumUpdated} premium, ${normalUpdated} normal`);
  } catch (error) {
    console.error('Error updating prices:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setPremiumPrices();

