import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The 31 allowed cards (mapped from struct names to marketplace names)
const allowedCards = [
  'HE BOOMANATOR',
  'The Suipreme Supra',
  'The Golden Toilet GT',
  'The 1974 Ford F-MBP',
  'The Suiverse Regera',
  'THE AQUA GT-R',
  'SkelSui: The Skel Energy GT 25',
  'The Mercedes-Builders G 550 4x4',
  'The Ark Live CyberVenture',
  'The Aston Manni',
  'The Juggernaut',
  'Night Viper',
  'Blaze Howler',
  'Crimson Phantom',
  'Iron Nomad',
  'Neon Fang',
  'Redline Reaper',
  'Blue Rupture',
  'Venom Circuit',
  'Ultra Pulse',
  'Scarlet Dominion',
  'Solar Drift',
  'Azure Strike',
  'Blood Apex',
  'Velocity Warden',
  'Toxic Surge',
  'Golden Revenant',
  'Midnight Brawler',
  'Phantom Vector',
  'Emerald Havoc',
  'HyperDune'
];

async function cleanupMarketplace() {
  try {
    console.log('Cleaning up marketplace to keep only the 31 allowed cards...\n');
    
    // Get all existing marketplace items
    const allItems = await prisma.marketplaceItem.findMany({
      select: { id: true, name: true },
    });
    
    console.log(`Found ${allItems.length} items in marketplace\n`);
    
    // Create a set of allowed card names (case-insensitive for comparison)
    const allowedNamesSet = new Set(allItems.map(item => item.name.toLowerCase()));
    const allowedLower = allowedCards.map(name => name.toLowerCase());
    
    // Find items to delete (not in the allowed list)
    const itemsToDelete = allItems.filter(item => {
      const itemNameLower = item.name.toLowerCase();
      return !allowedLower.includes(itemNameLower);
    });
    
    // Find items that should exist but don't
    const existingNames = new Set(allItems.map(item => item.name.toLowerCase()));
    const missingCards = allowedCards.filter(card => !existingNames.has(card.toLowerCase()));
    
    if (itemsToDelete.length > 0) {
      console.log(`Removing ${itemsToDelete.length} items that are not in the allowed list:\n`);
      for (const item of itemsToDelete) {
        console.log(`  ✗ Deleting: ${item.name}`);
        await prisma.marketplaceItem.delete({
          where: { id: item.id },
        });
      }
      console.log(`\n✓ Deleted ${itemsToDelete.length} items\n`);
    } else {
      console.log('✓ No items to delete\n');
    }
    
    if (missingCards.length > 0) {
      console.log(`Found ${missingCards.length} missing cards. Adding them...\n`);
      
      // Get an admin user ID
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      
      if (!adminUser) {
        console.error('No admin user found. Please create an admin user first.');
        process.exit(1);
      }
      
      for (const carName of missingCards) {
        try {
          await prisma.marketplaceItem.create({
            data: {
              name: carName,
              description: `A powerful NFT car ready for the track. ${carName} brings exceptional performance and style to your racing garage.`,
              imageUrl: null,
              price: 250000,
              status: 'ACTIVE',
              type: 'NFT',
              stock: 100,
              category: 'Car NFT',
              createdBy: adminUser.id,
            },
          });
          console.log(`  ✓ Added: ${carName}`);
        } catch (error: any) {
          console.error(`  ✗ Failed to add "${carName}":`, error.message);
        }
      }
      console.log(`\n✓ Added ${missingCards.length} missing cards\n`);
    } else {
      console.log('✓ All 31 cards are present\n');
    }
    
    // Final count
    const finalCount = await prisma.marketplaceItem.count();
    console.log(`\n✓ Marketplace cleanup complete!`);
    console.log(`  Total items in marketplace: ${finalCount}`);
    console.log(`  Expected: 31 cards`);
    
    if (finalCount === 31) {
      console.log(`  ✓ Perfect! All 31 cards are in the marketplace.`);
    } else {
      console.log(`  ⚠ Warning: Expected 31 cards but found ${finalCount}`);
    }
  } catch (error) {
    console.error('Error cleaning up marketplace:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupMarketplace();

