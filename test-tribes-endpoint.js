/**
 * Test the tribes endpoint directly to see the error
 */

import { prisma } from './backend/src/lib/prisma.js';
import { getUserTribes } from './backend/src/lib/tribePermissions.js';

const USER_ID = '99db43e7-6cd1-4c0d-81b1-06c192cf8d42';

async function testTribesEndpoint() {
  console.log('🧪 Testing tribes endpoint logic...\n');
  
  try {
    console.log('1️⃣  Calling getUserTribes...');
    const tribes = await getUserTribes(USER_ID);
    console.log(`   Found ${tribes.length} tribe memberships\n`);
    
    console.log('2️⃣  Tribe details:');
    tribes.forEach((membership, i) => {
      console.log(`   [${i}] Membership ID: ${membership.id}`);
      console.log(`       Tribe: ${membership.tribe?.name || 'NULL'}`);
      console.log(`       Tribe ID: ${membership.tribe?.id || 'NULL'}`);
      console.log(`       Deleted: ${membership.tribe?.deletedAt || 'No'}`);
    });
    console.log('');
    
    console.log('3️⃣  Processing tribes like the API does...');
    const validTribes = tribes.filter(membership => membership.tribe !== null);
    console.log(`   Valid tribes after filter: ${validTribes.length}\n`);
    
    for (const membership of validTribes) {
      console.log(`   Processing: ${membership.tribe.name}...`);
      
      try {
        // Get member count
        const memberCount = await prisma.tribeMember.count({
          where: {
            tribeId: membership.tribe.id,
            acceptedAt: { not: null },
            leftAt: null,
          }
        });
        console.log(`     ✅ Member count: ${memberCount}`);
        
      } catch (err) {
        console.log(`     ❌ Error: ${err.message}`);
      }
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testTribesEndpoint();
