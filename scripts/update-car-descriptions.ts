import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Car descriptions mapping
const carDescriptions: { [key: string]: string } = {
  'The Juggernaut': 'A gold-plated beast built to dominate. The Juggernaut crushes competition with unstoppable force, armored styling, and raw street authority. When it rolls out, everything else moves aside.',
  'Night Viper': 'Silent, sleek, and lethal. Night Viper strikes from the shadows with razor-sharp handling and venomous speed that leaves rivals stunned.',
  'Blaze Howler': 'Fueled by fire and fury, Blaze Howler screams down the asphalt with aggressive aero and track-bred rage. Built to be loud, fast, and feared.',
  'Crimson Phantom': 'A red-hot specter of speed. Crimson Phantom haunts the streets with deadly precision and a presence that\'s impossible to ignore.',
  'Iron Nomad': 'Tough, tactical, and relentless. Iron Nomad is forged for long hauls and hard battles, thriving where others break down.',
  'Neon Fang': 'Bright, bold, and brutally fast. Neon Fang bites hard with electric acceleration and predator-level reflexes.',
  'Redline Reaper': 'Living on the edge of the limiter. Redline Reaper devours straightaways and corners alike, collecting victories at full throttle.',
  'Blue Rupture': 'Calm on the outside, chaos underneath. Blue Rupture explodes off the line with controlled violence and surgical handling.',
  'Venom Circuit': 'Engineered for speed addiction. Venom Circuit floods the track with toxic pace and leaves nothing but tire smoke behind.',
  'Ultra Pulse': 'Every heartbeat fuels acceleration. Ultra Pulse is tuned for instant response, rapid bursts, and nonstop momentum.',
  'Scarlet Dominion': 'Built to rule, not race. Scarlet Dominion commands the road with ruthless power and elite-tier dominance.',
  'Solar Drift': 'Born from heat and motion. Solar Drift glides through corners with blazing confidence and radiant speed.',
  'Azure Strike': 'Precision meets power. Azure Strike delivers lightning-fast launches and razor-clean racing lines.',
  'Blood Apex': 'Designed to peak where others fail. Blood Apex thrives at the limit, turning danger into advantage.',
  'Velocity Warden': 'Guardian of pure speed. Velocity Warden balances control and aggression for elite-level domination.',
  'Toxic Surge': 'Green-lit chaos unleashed. Toxic Surge overwhelms opponents with relentless acceleration and savage grip.',
  'Golden Revenant': 'A legend reborn in gold. Golden Revenant rises from the past with timeless style and unforgiving speed.',
  'Midnight Brawler': 'Built for back-alley battles and street supremacy. Midnight Brawler hits hard and never backs down.',
  'Phantom Vector': 'Invisible until it\'s gone. Phantom Vector slices through air and opposition with ghost-like efficiency.',
  'Emerald Havoc': 'Pure green destruction. Emerald Havoc floods the streets with chaos, speed, and uncontrollable momentum.',
  'HyperDune': 'Designed for wide tracks and sandy paths with unstoppable momentum.'
};

async function updateCarDescriptions() {
  try {
    console.log('Updating car descriptions in marketplace...\n');
    
    // Get all marketplace items
    const allItems = await prisma.marketplaceItem.findMany({
      select: { id: true, name: true, description: true },
    });
    
    let updated = 0;
    let skipped = 0;
    
    for (const item of allItems) {
      const newDescription = carDescriptions[item.name];
      
      if (newDescription) {
        // Check if description needs updating
        if (item.description !== newDescription) {
          await prisma.marketplaceItem.update({
            where: { id: item.id },
            data: { description: newDescription },
          });
          console.log(`  ✓ Updated: ${item.name}`);
          updated++;
        } else {
          console.log(`  - Already up to date: ${item.name}`);
          skipped++;
        }
      } else {
        console.log(`  ⚠ No description found for: ${item.name}`);
        skipped++;
      }
    }
    
    console.log(`\n✓ Update complete!`);
    console.log(`  Updated: ${updated} cars`);
    console.log(`  Skipped: ${skipped} cars (already up to date or no description provided)`);
  } catch (error) {
    console.error('Error updating descriptions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateCarDescriptions();

