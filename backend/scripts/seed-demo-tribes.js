#!/usr/bin/env node

/**
 * Seed Demo Tribes with Synthetic Data
 * 
 * Creates 3 tribes with realistic members, messages, and proposals:
 * 1. Yoga Tribe
 * 2. Beach Crew
 * 3. Blvd Burger
 * 
 * Usage: node backend/scripts/seed-demo-tribes.js YOUR_USER_ID
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Synthetic user data
const SYNTHETIC_USERS = [
  { appleUserId: 'demo.user.sarah', name: 'Sarah Chen' },
  { appleUserId: 'demo.user.mike', name: 'Mike Johnson' },
  { appleUserId: 'demo.user.emma', name: 'Emma Davis' },
  { appleUserId: 'demo.user.alex', name: 'Alex Kim' },
  { appleUserId: 'demo.user.jordan', name: 'Jordan Taylor' },
  { appleUserId: 'demo.user.casey', name: 'Casey Morgan' },
  { appleUserId: 'demo.user.jamie', name: 'Jamie Rivera' },
  { appleUserId: 'demo.user.riley', name: 'Riley Parker' },
];

// Tribe configurations
const TRIBES = [
  {
    name: 'Yoga Tribe',
    owner: 'demo.user.sarah',
    members: ['demo.user.emma', 'demo.user.alex', 'demo.user.casey'],
    messages: [
      { from: 'demo.user.sarah', text: 'Hey everyone! Don\'t forget we have class tomorrow at 7am 🧘‍♀️' },
      { from: 'demo.user.emma', text: 'I\'ll be there! Should I bring extra mats?' },
      { from: 'demo.user.alex', text: 'Yes please! Mine is getting worn out' },
      { from: 'demo.user.casey', text: 'I might be 5 mins late, save me a spot!' },
      { from: 'demo.user.sarah', text: 'No worries Casey, we start with breathing anyway 😊' },
    ],
    proposals: [
      {
        from: 'demo.user.sarah',
        to: ['demo.user.emma', 'demo.user.alex'],
        itemType: 'appointment',
        data: {
          title: 'Saturday Morning Yoga',
          datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          durationMinutes: 60,
          withWhom: 'Yoga Tribe',
          location: 'Studio B',
        }
      }
    ]
  },
  {
    name: 'Beach Crew',
    owner: 'demo.user.mike',
    members: ['demo.user.jordan', 'demo.user.jamie', 'demo.user.riley'],
    messages: [
      { from: 'demo.user.mike', text: 'Surf\'s up this weekend! Who\'s in? 🏄‍♂️' },
      { from: 'demo.user.jordan', text: 'Count me in! What time?' },
      { from: 'demo.user.jamie', text: 'I\'m bringing the cooler and snacks' },
      { from: 'demo.user.riley', text: 'Early morning? Waves are better before noon' },
      { from: 'demo.user.mike', text: 'Let\'s meet at 8am at the pier' },
      { from: 'demo.user.jordan', text: 'Perfect! See you all there 🌊' },
    ],
    proposals: [
      {
        from: 'demo.user.mike',
        to: ['demo.user.jordan', 'demo.user.jamie', 'demo.user.riley'],
        itemType: 'grocery',
        data: {
          items: ['Sunscreen SPF 50', 'Water bottles', 'Beach umbrella', 'Snacks']
        }
      }
    ]
  },
  {
    name: 'Blvd Burger',
    owner: 'demo.user.emma',
    members: ['demo.user.mike', 'demo.user.sarah', 'demo.user.alex'],
    messages: [
      { from: 'demo.user.emma', text: 'Who wants to try that new burger place on Boulevard? 🍔' },
      { from: 'demo.user.mike', text: 'I\'m always down for burgers!' },
      { from: 'demo.user.sarah', text: 'They have vegan options too right?' },
      { from: 'demo.user.emma', text: 'Yes! Impossible burger and veggie wraps' },
      { from: 'demo.user.alex', text: 'Friday night? 7pm?' },
      { from: 'demo.user.emma', text: 'Works for me! I\'ll make a reservation' },
      { from: 'demo.user.mike', text: '🎉 Can\'t wait!' },
    ],
    proposals: [
      {
        from: 'demo.user.emma',
        to: ['demo.user.mike', 'demo.user.sarah', 'demo.user.alex'],
        itemType: 'appointment',
        data: {
          title: 'Blvd Burger Dinner',
          datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          durationMinutes: 90,
          withWhom: 'Blvd Burger crew',
          location: 'Boulevard Burger Bar',
          topic: 'Try new menu items'
        }
      },
      {
        from: 'demo.user.alex',
        to: ['demo.user.mike'],
        itemType: 'todo',
        data: {
          title: 'Bring cash for parking',
          priority: 'medium',
        }
      }
    ]
  }
];

async function createOrGetUser(appleUserId, name) {
  let user = await prisma.user.findUnique({
    where: { appleUserId }
  });
  
  if (!user) {
    user = await prisma.user.create({
      data: { appleUserId }
    });
    console.log(`   ✅ Created synthetic user: ${name} (${appleUserId})`);
  } else {
    console.log(`   ℹ️  Using existing user: ${name} (${user.id})`);
  }
  
  return user;
}

async function seedDemoTribes(realUserId) {
  console.log('🌱 ========================================');
  console.log('🌱 Seeding Demo Tribes');
  console.log('🌱 ========================================\n');
  
  console.log(`📝 Your User ID: ${realUserId}\n`);
  
  // Create synthetic users
  console.log('👥 Creating synthetic users...');
  const userMap = {};
  for (const userData of SYNTHETIC_USERS) {
    const user = await createOrGetUser(userData.appleUserId, userData.name);
    userMap[userData.appleUserId] = user.id;
  }
  console.log('');
  
  // Create tribes
  for (const tribeConfig of TRIBES) {
    console.log(`\n🏘️  Creating tribe: ${tribeConfig.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Get owner user ID (use real user for owner)
    const ownerId = realUserId;
    
    // Create tribe
    const tribe = await prisma.tribe.create({
      data: {
        name: tribeConfig.name,
        ownerId: ownerId,
      }
    });
    console.log(`   ✅ Tribe created: ${tribe.name} (${tribe.id})`);
    
    // Add owner as member
    await prisma.tribeMember.create({
      data: {
        tribeId: tribe.id,
        userId: ownerId,
        invitedBy: ownerId,
        acceptedAt: new Date(),
      }
    });
    console.log(`   ✅ Added owner (you) as member`);
    
    // Add other members
    console.log(`   👥 Adding ${tribeConfig.members.length} members...`);
    const memberIds = [];
    for (const memberAppleId of tribeConfig.members) {
      const memberId = userMap[memberAppleId];
      const member = await prisma.tribeMember.create({
        data: {
          tribeId: tribe.id,
          userId: memberId,
          invitedBy: ownerId,
          acceptedAt: new Date(), // All synthetic members auto-accept
        }
      });
      memberIds.push(member.id);
      const memberName = SYNTHETIC_USERS.find(u => u.appleUserId === memberAppleId)?.name;
      console.log(`      - ${memberName}`);
    }
    
    // Create messages
    if (tribeConfig.messages.length > 0) {
      console.log(`   💬 Adding ${tribeConfig.messages.length} messages...`);
      for (const [index, msgConfig] of tribeConfig.messages.entries()) {
        const fromUserId = msgConfig.from === tribeConfig.owner 
          ? ownerId 
          : userMap[msgConfig.from];
        
        await prisma.tribeMessage.create({
          data: {
            tribeId: tribe.id,
            userId: fromUserId,
            message: msgConfig.text,
            createdAt: new Date(Date.now() - (tribeConfig.messages.length - index) * 60 * 60 * 1000), // Spread over hours
          }
        });
      }
      console.log(`      ✅ Messages added`);
    }
    
    // Create proposals (tribe items)
    if (tribeConfig.proposals.length > 0) {
      console.log(`   📋 Creating ${tribeConfig.proposals.length} proposals...`);
      for (const proposalConfig of tribeConfig.proposals) {
        const fromUserId = proposalConfig.from === tribeConfig.owner
          ? ownerId
          : userMap[proposalConfig.from];
        
        // Create tribe item
        const item = await prisma.tribeItem.create({
          data: {
            tribeId: tribe.id,
            createdBy: fromUserId,
            itemType: proposalConfig.itemType,
            data: proposalConfig.data,
          }
        });
        
        // Create proposals for recipients
        for (const recipientAppleId of proposalConfig.to) {
          const recipientUserId = userMap[recipientAppleId];
          
          // Find recipient's tribe member record
          const recipientMember = await prisma.tribeMember.findFirst({
            where: {
              tribeId: tribe.id,
              userId: recipientUserId,
            }
          });
          
          if (recipientMember) {
            await prisma.tribeProposal.create({
              data: {
                itemId: item.id,
                recipientId: recipientMember.id,
                state: 'proposed',
              }
            });
          }
        }
        
        console.log(`      - ${proposalConfig.itemType} proposal created`);
      }
    }
    
    console.log(`   ✅ ${tribeConfig.name} complete!`);
  }
  
  console.log('\n🎉 ========================================');
  console.log('🎉 Demo Tribes Created Successfully!');
  console.log('🎉 ========================================\n');
  
  console.log('📱 What was created:\n');
  console.log('1️⃣  Yoga Tribe');
  console.log('   - 4 members (you + Sarah, Emma, Alex, Casey)');
  console.log('   - 5 messages about morning class');
  console.log('   - 1 appointment proposal for Saturday yoga\n');
  
  console.log('2️⃣  Beach Crew');
  console.log('   - 4 members (you + Jordan, Jamie, Riley)');
  console.log('   - 6 messages planning surf trip');
  console.log('   - 1 grocery list proposal (sunscreen, water, etc)\n');
  
  console.log('3️⃣  Blvd Burger');
  console.log('   - 4 members (you + Mike, Sarah, Alex)');
  console.log('   - 7 messages planning dinner');
  console.log('   - 2 proposals (dinner appointment + parking reminder)\n');
  
  console.log('🔄 Refresh your app to see the new tribes!');
}

// Main execution
async function main() {
  const realUserId = process.argv[2];
  
  if (!realUserId) {
    console.error('❌ Error: User ID required');
    console.error('');
    console.error('Usage: node backend/scripts/seed-demo-tribes.js YOUR_USER_ID');
    console.error('');
    console.error('To find your user ID:');
    console.error('  1. Check your iOS app logs');
    console.error('  2. Or query: SELECT id FROM users WHERE apple_user_id = \'your-apple-id\';');
    console.error('');
    process.exit(1);
  }
  
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: realUserId }
  });
  
  if (!user) {
    console.error(`❌ Error: User not found with ID: ${realUserId}`);
    console.error('Please provide a valid user ID from your database.');
    process.exit(1);
  }
  
  console.log(`✅ Found user: ${user.appleUserId}`);
  
  try {
    await seedDemoTribes(realUserId);
    console.log('\n✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding tribes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
