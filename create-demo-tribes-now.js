/**
 * Manually create demo tribes for user RIGHT NOW
 */

import { prisma } from './backend/src/lib/prisma.js';

const USER_ID = '99db43e7-6cd1-4c0d-81b1-06c192cf8d42';

async function createDemoTribesNow() {
  console.log('🎬 Creating demo tribes for user NOW...\n');
  
  try {
    // Get synthetic user IDs
    const syntheticUsers = await prisma.user.findMany({
      where: {
        appleUserId: {
          startsWith: 'demo-'
        }
      },
      select: { id: true, appleUserId: true }
    });

    console.log(`Found ${syntheticUsers.length} synthetic users\n`);

    const userMap = {};
    syntheticUsers.forEach(u => {
      userMap[u.appleUserId] = u.id;
    });

    // Create 3 demo tribes
    const tribes = [
      {
        name: '🏠 My Family',
        members: [
          'demo-sarah-spouse-001',
          'demo-mom-family-001', 
          'demo-alex-kid-001'
        ]
      },
      {
        name: '💼 Work Team',
        members: [
          'demo-jordan-manager-001',
          'demo-casey-teammate-001',
          'demo-morgan-designer-001'
        ]
      },
      {
        name: '🏘️ Roommates',
        members: [
          'demo-taylor-roommate-001',
          'demo-jamie-roommate-002',
          'demo-chris-roommate-003'
        ]
      }
    ];

    for (const tribeTemplate of tribes) {
      console.log(`Creating: ${tribeTemplate.name}...`);
      
      // Create tribe
      const tribe = await prisma.tribe.create({
        data: {
          name: tribeTemplate.name,
          ownerId: USER_ID,
        }
      });

      console.log(`  ✅ Tribe created: ${tribe.id}`);

      // Add user as member
      const userMember = await prisma.tribeMember.create({
        data: {
          tribeId: tribe.id,
          userId: USER_ID,
          invitedBy: USER_ID,
          acceptedAt: new Date(),
        }
      });

      // Create permissions for user
      await prisma.tribeMemberPermissions.create({
        data: {
          memberId: userMember.id,
          canAddTasks: true,
          canRemoveTasks: true,
          canAddRoutines: true,
          canRemoveRoutines: true,
          canAddAppointments: true,
          canRemoveAppointments: true,
          canAddGroceries: true,
          canRemoveGroceries: true,
        }
      });

      console.log(`  ✅ User added as owner`);

      // Add synthetic members
      for (const memberAppleId of tribeTemplate.members) {
        const synthUserId = userMap[memberAppleId];
        if (!synthUserId) {
          console.log(`  ⚠️  Skipping ${memberAppleId} (not found)`);
          continue;
        }

        const member = await prisma.tribeMember.create({
          data: {
            tribeId: tribe.id,
            userId: synthUserId,
            invitedBy: USER_ID,
            acceptedAt: new Date(),
          }
        });

        await prisma.tribeMemberPermissions.create({
          data: {
            memberId: member.id,
            canAddTasks: true,
            canRemoveTasks: false,
            canAddRoutines: true,
            canRemoveRoutines: false,
            canAddAppointments: true,
            canRemoveAppointments: false,
            canAddGroceries: true,
            canRemoveGroceries: false,
          }
        });

        console.log(`  ✅ Added ${memberAppleId}`);
      }

      console.log('');
    }

    // Verify
    const userTribes = await prisma.tribe.findMany({
      where: {
        members: {
          some: {
            userId: USER_ID,
            leftAt: null,
          }
        },
        deletedAt: null,
      },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
          }
        }
      }
    });

    console.log('✅ COMPLETE!\n');
    console.log(`User now has ${userTribes.length} tribes:`);
    userTribes.forEach(t => {
      console.log(`  - ${t.name} (${t.members.length} members)`);
    });
    console.log('\n🎉 Demo tribes are ready! Open your app now!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoTribesNow();
