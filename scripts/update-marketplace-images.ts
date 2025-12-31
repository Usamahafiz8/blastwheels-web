import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of car names to their corresponding image files
const carImageMapping: { [key: string]: string } = {
  // PNG images (existing car images)
  'Azure Strike': 'azurestrike.png',
  'Blaze Howler': 'blaze.png',
  'Blood Apex': 'bloodapex.png',
  'Blue Rupture': 'bluerupture.png',
  'Crimson Phantom': 'crimson.png',
  'Emerald Havoc': 'emeraldhavoc.png',
  'Golden Revenant': 'GoldenRevenant.png',
  'HyperDune': 'hyperdune.png',
  'Iron Nomad': 'iron.png',
  'The Juggernaut': 'jugernaut.png',
  'Midnight Brawler': 'MidnightBrawler.png',
  'Neon Fang': 'neonfang.png',
  'Night Viper': 'nightviper.png',
  'Phantom Vector': 'Phantomvector.png',
  'Redline Reaper': 'redline.png',
  'Scarlet Dominion': 'scarlet.png',
  'Solar Drift': 'solar.png',
  'Toxic Surge': 'toxicsurge.png',
  'Ultra Pulse': 'ultrapulse.png',
  'Velocity Warden': 'velocitywarden.png',
  'Venom Circuit': 'venomcircuit.png',

  // JPEG images (sponsor cars)
  'HE BOOMANATOR': 'image1.jpeg',
  'The Suipreme Supra': 'image2.jpeg',
  'The Golden Toilet GT': 'image4.jpeg',
  'The 1974 Ford F-MBP': 'image5.jpeg',
  'The Suiverse Regera': 'image6.jpeg',
  'THE AQUA GT-R': 'image7.jpeg',
  'SkelSui: The Skel Energy GT 25': 'image8.jpeg',
  'The Mercedes-Builders G 550 4x4': 'image9.jpeg',
  'The Ark Live CyberVenture': 'image10.jpeg',
  'The Aston Manni': 'image11.jpeg',
};

async function updateMarketplaceImages() {
  try {
    console.log('Updating marketplace items with image associations...\n');

    // Get all marketplace items
    const items = await prisma.marketplaceItem.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        type: true,
        category: true,
      },
    });

    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      const mappedImage = carImageMapping[item.name];

      if (mappedImage) {
        // Check if the item already has this image
        const currentImageUrl = item.imageUrl;
        const newImageUrl = mappedImage;

        if (currentImageUrl !== newImageUrl) {
          await prisma.marketplaceItem.update({
            where: { id: item.id },
            data: { imageUrl: newImageUrl },
          });
          console.log(`  ✓ Updated: ${item.name} -> ${newImageUrl}`);
          updated++;
        } else {
          console.log(`  - Already correct: ${item.name} -> ${currentImageUrl}`);
          skipped++;
        }
      } else {
        console.log(`  ⚠ No image mapping found for: ${item.name}`);
        skipped++;
      }
    }

    console.log(`\n✓ Update complete!`);
    console.log(`  Updated: ${updated} items`);
    console.log(`  Skipped: ${skipped} items (already correct or no mapping)`);

    // Show final summary
    console.log('\nFinal marketplace items with images:');
    const finalItems = await prisma.marketplaceItem.findMany({
      where: { imageUrl: { not: null } },
      select: { name: true, imageUrl: true },
      orderBy: { name: 'asc' }
    });

    finalItems.forEach(item => {
      console.log(`  ${item.name} -> ${item.imageUrl}`);
    });

  } catch (error) {
    console.error('Error updating marketplace images:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateMarketplaceImages();
