import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of new cars to add
const newCars = [
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

async function addMoreCars() {
  try {
    const price = 250000;
    const adminUserId = 'admin-placeholder'; // We'll need to get a real admin user ID
    
    console.log('Checking existing marketplace items...\n');
    
    // Get all existing marketplace items to check for duplicates
    const existingItems = await prisma.marketplaceItem.findMany({
      select: { name: true },
    });
    
    const existingNames = new Set(existingItems.map(item => item.name.toLowerCase()));
    
    console.log(`Found ${existingItems.length} existing items in marketplace\n`);
    
    // Get an admin user ID (or use the first admin user)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    
    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      process.exit(1);
    }
    
    const carsToAdd = newCars.filter(carName => {
      const exists = existingNames.has(carName.toLowerCase());
      if (exists) {
        console.log(`⏭️  Skipping "${carName}" - already exists`);
        return false;
      }
      return true;
    });
    
    if (carsToAdd.length === 0) {
      console.log('\n✓ All cars already exist in the marketplace. No new cars to add.');
      return;
    }
    
    console.log(`\nAdding ${carsToAdd.length} new cars to marketplace:\n`);
    
    for (const carName of carsToAdd) {
      try {
        const item = await prisma.marketplaceItem.create({
          data: {
            name: carName,
            description: `A powerful NFT car ready for the track. ${carName} brings exceptional performance and style to your racing garage.`,
            imageUrl: null, // You can add image URLs later
            price: price,
            status: 'ACTIVE',
            type: 'NFT',
            stock: 100, // Set stock to 100 for each
            category: 'Car NFT',
            createdBy: adminUser.id,
          },
        });
        
        console.log(`  ✓ Added: ${carName} (Price: ${price} blastwheelz)`);
      } catch (error: any) {
        console.error(`  ✗ Failed to add "${carName}":`, error.message);
      }
    }
    
    console.log(`\n✓ Successfully added ${carsToAdd.length} cars to the marketplace!`);
  } catch (error) {
    console.error('Error adding cars:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addMoreCars();

