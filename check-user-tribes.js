#!/usr/bin/env node

/**
 * Check tribes for a specific user
 */

import { prisma } from './backend/src/lib/prisma.js';

const userIdFragment = process.argv[2] || '9uJ';

async function checkUserTribes() {
  try {
    console.log(`🔍 Looking for users matching: ${userIdFragment}\n`);
    
    // Find user - first get recent users then filter
    const allUsers = await prisma.user.findMany({
      orderBy: { lastActiveAt: 'desc' },
      take: 50,
    });
    
    const users = allUsers.filter(u => 
      u.id.includes(userIdFragment) || u.appleUserId.includes(userIdFragment)
    ).slice(0, 5);
    
    if (users.length === 0) {
      console.log(`❌ No users found matching "${userIdFragment}"`);
      return;
    }
    
    console.log(`✅ Found ${users.length} user(s):\n`);
    
    for (const user of users) {
      console.log(`User ID: ${user.id}`);
      console.log(`Apple User ID: ${user.appleUserId}`);
      console.log(`Last Active: ${user.lastActiveAt}\n`);
      
      // Get tribes for this user
      const tribeMembers = await prisma.tribeMember.findMany({
        where: {
          userId: user.id,
          leftAt: null,
        },
        include: {
          tribe: true,
          permissions: true,
        },
      });
      
      console.log(`  Tribes: ${tribeMembers.length}`);
      
      for (const member of tribeMembers) {
        const status = member.acceptedAt ? '✅ Accepted' : '⏳ Pending';
        console.log(`    - ${member.tribe.name} (${status})`);
        console.log(`      Tribe ID: ${member.tribeId}`);
        console.log(`      Member ID: ${member.id}`);
        console.log(`      Invited: ${member.invitedAt}`);
        if (member.acceptedAt) {
          console.log(`      Accepted: ${member.acceptedAt}`);
        }
        if (member.permissions) {
          console.log(`      Permissions: ✓`);
        } else {
          console.log(`      ⚠️  WARNING: No permissions record!`);
        }
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserTribes();
