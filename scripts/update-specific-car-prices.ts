import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSpecificCarPrices() {
  try {
    const highPrice = 500000;
    const normalPrice = 250000;
    
    // Cars to set to 500000
    const carsToUpdateHigh = [
      'HyperDune',
      'CoreRunner',
      'LumaRide',
      'Shockra',
      'ZenVelo',
      'RustRider',
      'NovaDash',
      'Phantomix',
      'Gravex',
      'AeroPulse',
      'BlazeCore'
    ];
    
    // Cars to revert to 250000 (the ones we just updated)
    const carsToRevert = [
      'The Juggernaut',
      'VeloSpark',
      'Driftara',
      'TurboNix',
      'Cryonix',
      'Voltide',
      'DustHawk',
      'NeonCruze',
      'IronVee',
      'SkyRift'
    ];
    
    console.log(`Updating specific car prices...\n`);
    
    // Update cars to 500000
    console.log(`Setting ${carsToUpdateHigh.length} cars to ${highPrice} blastwheelz:`);
    for (const carName of carsToUpdateHigh) {
      const items = await prisma.marketplaceItem.findMany({
        where: { name: carName },
      });
      
      if (items.length > 0) {
        for (const item of items) {
          await prisma.marketplaceItem.update({
            where: { id: item.id },
            data: { price: highPrice },
          });
          console.log(`  ✓ ${item.name}: ${item.price} → ${highPrice} blastwheelz`);
        }
      } else {
        console.log(`  ✗ ${carName}: Not found`);
      }
    }
    
    console.log(`\nReverting ${carsToRevert.length} cars to ${normalPrice} blastwheelz:`);
    for (const carName of carsToRevert) {
      const items = await prisma.marketplaceItem.findMany({
        where: { name: carName },
      });
      
      if (items.length > 0) {
        for (const item of items) {
          await prisma.marketplaceItem.update({
            where: { id: item.id },
            data: { price: normalPrice },
          });
          console.log(`  ✓ ${item.name}: ${item.price} → ${normalPrice} blastwheelz`);
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

updateSpecificCarPrices();

