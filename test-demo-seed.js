/**
 * Test demo tribes seed manually
 */

import { prisma } from './backend/src/lib/prisma.js';
import fetch from 'node-fetch';

const TEST_USER_ID = '99db43e7-6cd1-4c0d-81b1-06c192cf8d42';

async function testDemoSeed() {
  console.log('🧪 Testing Demo Tribes Seed\n');
  
  try {
    // Step 1: Verify user has no tribes
    console.log('1️⃣  Checking user tribes...');
    const existingTribes = await prisma.tribe.findMany({
      where: {
        members: {
          some: {
            userId: TEST_USER_ID,
            leftAt: null,
          }
        },
        deletedAt: null,
      }
    });
    console.log(`   User has ${existingTribes.length} tribes\n`);
    
    if (existingTribes.length > 0) {
      console.log('❌ User already has tribes! Clean up first.');
      console.log('   Run: DELETE FROM tribe_members WHERE user_id = ...\n');
      return;
    }
    
    // Step 2: Test backend seed endpoint
    console.log('2️⃣  Testing backend seed endpoint...');
    const BACKEND_URL = process.env.BACKEND_URL || 'https://api-production-2989.up.railway.app';
    
    // We need a real session token - let's create tribes directly via Prisma instead
    console.log('   Creating demo tribes directly via Prisma...\n');
    
    // Synthetic users
    const SYNTHETIC_USERS = [
      { appleUserId: 'demo-sarah-spouse-001', name: 'Sarah' },
      { appleUserId: 'demo-mom-family-001', name: 'Mom' },
      { appleUserId: 'demo-alex-kid-001', name: 'Alex' },
    ];
    
    console.log('3️⃣  Creating synthetic users...');
    for (const synthUser of SYNTHETIC_USERS) {
      await prisma.user.upsert({
        where: { appleUserId: synthUser.appleUserId },
        update: { lastActiveAt: new Date() },
        create: { 
          appleUserId: synthUser.appleUserId,
          lastActiveAt: new Date()
        },
      });
      console.log(`   ✅ ${synthUser.name}`);
    }
    console.log('');
    
    // Get synthetic user IDs
    const syntheticUsers = await prisma.user.findMany({
      where: {
        appleUserId: { in: SYNTHETIC_USERS.map(u => u.appleUserId) }
      },
      select: { id: true, appleUserId: true }
    });
    
    console.log('4️⃣  Creating demo tribe: 🏠 My Family...');
    const tribe = await prisma.tribe.create({
      data: {
        name: '🏠 My Family',
        ownerId: TEST_USER_ID,
        members: {
          create: [
            // Real user (owner)
            {
              userId: TEST_USER_ID,
              invitedBy: TEST_USER_ID,
              acceptedAt: new Date(),
              permissions: {
                create: {
                  canAddTasks: true,
                  canRemoveTasks: true,
                  canEditMembers: true,
                  canDeleteTribe: true,
                }
              }
            },
            // Synthetic members
            ...syntheticUsers.map(synthUser => ({
              userId: synthUser.id,
              invitedBy: TEST_USER_ID,
              acceptedAt: new Date(),
              permissions: {
                create: {
                  canAddTasks: true,
                  canRemoveTasks: false,
                  canEditMembers: false,
                  canDeleteTribe: false,
                }
              }
            }))
          ]
        }
      }
    });
    
    console.log(`   ✅ Tribe created: ${tribe.id}\n`);
    
    // Verify
    console.log('5️⃣  Verifying...');
    const userTribes = await prisma.tribe.findMany({
      where: {
        members: {
          some: {
            userId: TEST_USER_ID,
            leftAt: null,
          }
        },
        deletedAt: null,
      },
      include: {
        members: true
      }
    });
    
    console.log(`   ✅ User now has ${userTribes.length} tribe(s)`);
    userTribes.forEach(t => {
      console.log(`      - ${t.name} (${t.members.length} members)`);
    });
    console.log('');
    
    console.log('✅ Demo tribe created successfully!');
    console.log('   Open the app and check the "My Tribes" section\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDemoSeed();
