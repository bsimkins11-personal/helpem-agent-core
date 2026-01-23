/**
 * Clean up old demo tribes to allow new demo system to work
 */

import { prisma } from './backend/src/lib/prisma.js';

const OLD_DEMO_TRIBE_NAMES = [
  'Yoga Tribe',
  'Beach Crew',
  'Blvd Burger',
  'Test tribe',
  'Norayne' // Remove test tribes too
];

async function cleanupOldDemoTribes() {
  console.log('🧹 Cleaning up old demo tribes...\n');
  
  try {
    // Find all old demo tribes
    const oldTribes = await prisma.tribe.findMany({
      where: {
        name: {
          in: OLD_DEMO_TRIBE_NAMES
        },
        deletedAt: null
      },
      include: {
        members: {
          select: {
            id: true,
            userId: true
          }
        }
      }
    });

    console.log(`Found ${oldTribes.length} old demo tribes to clean up:`);
    oldTribes.forEach(tribe => {
      console.log(`  - ${tribe.name} (${tribe.members.length} members)`);
    });

    if (oldTribes.length === 0) {
      console.log('\n✅ No old demo tribes to clean up!');
      return;
    }

    // Soft delete them
    const result = await prisma.tribe.updateMany({
      where: {
        name: {
          in: OLD_DEMO_TRIBE_NAMES
        },
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });

    console.log(`\n✅ Soft-deleted ${result.count} old demo tribes`);
    console.log('\n🎬 Now the new demo tribes system will work!');
    console.log('   User will get: 🏠 My Family, 💼 Work Team, 🏘️ Roommates\n');

  } catch (error) {
    console.error('❌ Error cleaning up:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOldDemoTribes();
