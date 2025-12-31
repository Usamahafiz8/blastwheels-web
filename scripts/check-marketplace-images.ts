import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMarketplaceImages() {
  try {
    console.log('Checking marketplace items and their image associations...\n');

    // Get all marketplace items
    const items = await prisma.marketplaceItem.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        type: true,
        category: true,
        status: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${items.length} marketplace items:\n`);

    let withImages = 0;
    let withoutImages = 0;

    items.forEach(item => {
      const hasImage = item.imageUrl !== null;
      const status = hasImage ? '✓' : '✗';

      console.log(`${status} ${item.name}`);
      console.log(`   Type: ${item.type}, Category: ${item.category || 'N/A'}, Status: ${item.status}`);
      console.log(`   Image: ${item.imageUrl || 'No image'}`);
      console.log('');

      if (hasImage) withImages++;
      else withoutImages++;
    });

    console.log(`Summary:`);
    console.log(`  Items with images: ${withImages}`);
    console.log(`  Items without images: ${withoutImages}`);
    console.log(`  Total items: ${items.length}`);

  } catch (error) {
    console.error('Error checking marketplace images:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkMarketplaceImages();
