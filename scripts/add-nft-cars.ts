import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NFT_CARS = [
  {
    name: "The Juggernaut",
    description: "A gold-plated beast built to dominate. The Juggernaut crushes competition with unstoppable force, armored styling, and raw street authority. When it rolls out, everything else moves aside",
    imageUrl: "image1.jpeg"
  },
  {
    name: "VeloSpark",
    description: "Lightweight and agile, designed for quick bursts of speed and sharp turns.",
    imageUrl: "image2.jpeg"
  },
  {
    name: "Driftara",
    description: "A stylish ride known for effortless drifting and controlled chaos.",
    imageUrl: "image3.jpeg"
  },
  {
    name: "TurboNix",
    description: "Powered by raw energy, TurboNix thrives in fast-paced racing environments.",
    imageUrl: "image4.jpeg"
  },
  {
    name: "Cryonix",
    description: "An icy-themed car that stays calm and precise even at top speed.",
    imageUrl: "image5.jpeg"
  },
  {
    name: "Voltide",
    description: "Electric-inspired design delivering balanced speed and stability.",
    imageUrl: "image6.jpeg"
  },
  {
    name: "DustHawk",
    description: "Built for rough paths, DustHawk dominates dirty and uneven tracks.",
    imageUrl: "image7.jpeg"
  },
  {
    name: "NeonCruze",
    description: "A glowing street racer made for smooth cruising and flashy finishes.",
    imageUrl: "image8.jpeg"
  },
  {
    name: "IronVee",
    description: "Solid, heavy, and dependable with a bold industrial feel.",
    imageUrl: "image9.jpeg"
  },
  {
    name: "SkyRift",
    description: "A sleek high-speed car that feels like it floats over the road.",
    imageUrl: "image10.jpeg"
  },
  {
    name: "BlazeCore",
    description: "Fueled by fiery visuals and aggressive acceleration.",
    imageUrl: "image11.jpeg"
  },
  {
    name: "AeroPulse",
    description: "Aerodynamic design crafted for clean lines and fast flow.",
    imageUrl: "image1.jpeg" // Cycling through images
  },
  {
    name: "Gravex",
    description: "A futuristic machine that feels grounded no matter the terrain.",
    imageUrl: "image2.jpeg"
  },
  {
    name: "Phantomix",
    description: "Silent, mysterious, and smooth with ghost-like movement.",
    imageUrl: "image3.jpeg"
  },
  {
    name: "NovaDash",
    description: "Explosive speed packed into a compact and stylish body.",
    imageUrl: "image4.jpeg"
  },
  {
    name: "RustRider",
    description: "A rugged classic with worn textures and raw personality.",
    imageUrl: "image5.jpeg"
  },
  {
    name: "ZenVelo",
    description: "A calm, balanced ride perfect for controlled and steady racing.",
    imageUrl: "image6.jpeg"
  },
  {
    name: "Shockra",
    description: "Bold design with sharp edges and high-impact presence.",
    imageUrl: "image7.jpeg"
  },
  {
    name: "LumaRide",
    description: "Bright, clean visuals paired with smooth performance.",
    imageUrl: "image8.jpeg"
  },
  {
    name: "CoreRunner",
    description: "A reliable all-rounder built for consistency and control.",
    imageUrl: "image9.jpeg"
  },
  {
    name: "HyperDune",
    description: "Designed for wide tracks and sandy paths with unstoppable momentum.",
    imageUrl: "image10.jpeg"
  }
];

async function main() {
  console.log('🚀 Starting to add NFT cars to marketplace...\n');

  // Get admin user
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!admin) {
    console.error('❌ No admin user found. Please seed the database first.');
    process.exit(1);
  }

  console.log(`✅ Found admin user: ${admin.username} (${admin.id})\n`);

  const price = 250000; // Price in blastwheelz
  const stock = 100;
  const type = 'NFT';
  const status = 'ACTIVE';
  const category = 'Car NFT';

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < NFT_CARS.length; i++) {
    const car = NFT_CARS[i];
    const srNo = i + 1;

    try {
      // Check if item already exists
      const existing = await prisma.marketplaceItem.findFirst({
        where: { name: car.name }
      });

      if (existing) {
        console.log(`⏭️  [${srNo}] "${car.name}" already exists, skipping...`);
        continue;
      }

      const item = await prisma.marketplaceItem.create({
        data: {
          name: car.name,
          description: car.description,
          imageUrl: car.imageUrl,
          price: price,
          status: status,
          type: type,
          stock: stock,
          category: category,
          createdBy: admin.id,
          metadata: {
            srNo: srNo,
            quantity: stock,
            nftType: 'Car'
          }
        }
      });

      console.log(`✅ [${srNo}] Created: "${car.name}" (ID: ${item.id})`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ [${srNo}] Failed to create "${car.name}":`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Completed!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📦 Total: ${NFT_CARS.length}`);
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

