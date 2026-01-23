#!/usr/bin/env node

/**
 * Check if there are any tribes in the database
 */

import { prisma } from './backend/src/lib/prisma.js';

async function checkTribesData() {
  try {
    console.log('🔍 Checking tribes data...\n');
    
    // Count users
    const userCount = await prisma.user.count();
    console.log(`👥 Total Users: ${userCount}`);
    
    // Count tribes
    const tribeCount = await prisma.tribe.count();
    const activeTribes = await prisma.tribe.count({
      where: { deletedAt: null }
    });
    console.log(`🏘️  Total Tribes: ${tribeCount}`);
    console.log(`🏘️  Active Tribes: ${activeTribes}\n`);
    
    if (activeTribes === 0) {
      console.log('⚠️  NO TRIBES FOUND IN DATABASE!\n');
      console.log('To create a tribe:');
      console.log('1. Log in to the app with a user account');
      console.log('2. Use the tribes feature to create a new tribe');
      console.log('3. Or use the backend API: POST /tribes\n');
    } else {
      // Show tribe details
      const tribes = await prisma.tribe.findMany({
        where: { deletedAt: null },
        include: {
          members: {
            where: { leftAt: null },
          }
        },
        take: 10,
      });
      
      console.log('📋 Active Tribes:\n');
      for (const tribe of tribes) {
        const memberCount = tribe.members.length;
        const acceptedMembers = tribe.members.filter(m => m.acceptedAt).length;
        console.log(`  • ${tribe.name}`);
        console.log(`    ID: ${tribe.id}`);
        console.log(`    Owner: ${tribe.ownerId}`);
        console.log(`    Members: ${acceptedMembers}/${memberCount} accepted`);
        console.log(`    Created: ${tribe.createdAt}`);
        console.log('');
      }
    }
    
    // Check tribe members
    const memberCount = await prisma.tribeMember.count();
    const acceptedMembers = await prisma.tribeMember.count({
      where: { acceptedAt: { not: null }, leftAt: null }
    });
    console.log(`\n👥 Tribe Memberships: ${acceptedMembers}/${memberCount} accepted\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkTribesData();
