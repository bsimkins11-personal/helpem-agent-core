/**
 * Admin endpoint to seed demo tribes
 * ONE-TIME USE - Remove after seeding
 * 
 * POST /api/admin/seed-tribes
 */

import { prisma } from '../src/lib/prisma.js';

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
    members: ['demo.user.sarah', 'demo.user.emma', 'demo.user.alex', 'demo.user.casey'],
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
          datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 60,
          withWhom: 'Yoga Tribe',
          location: 'Studio B',
        }
      }
    ]
  },
  {
    name: 'Beach Crew',
    members: ['demo.user.jordan', 'demo.user.jamie', 'demo.user.riley', 'demo.user.mike'],
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
    members: ['demo.user.emma', 'demo.user.mike', 'demo.user.sarah', 'demo.user.alex'],
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
          datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
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
  let user = await prisma.user.findUnique({ where: { appleUserId } });
  
  if (!user) {
    user = await prisma.user.create({ data: { appleUserId } });
    console.log(`   ✅ Created: ${name}`);
  }
  
  return user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('🌱 Starting tribe seeding...');
    
    // Find most recent user (owner of tribes)
    const owner = await prisma.user.findFirst({
      orderBy: { lastActiveAt: 'desc' }
    });
    
    if (!owner) {
      return res.status(400).json({ error: 'No users found. Sign in first.' });
    }
    
    console.log(`✅ Owner: ${owner.appleUserId} (${owner.id})`);
    
    // Create synthetic users
    const userMap = {};
    for (const userData of SYNTHETIC_USERS) {
      const user = await createOrGetUser(userData.appleUserId, userData.name);
      userMap[userData.appleUserId] = user.id;
    }
    
    const results = [];
    
    // Create tribes
    for (const tribeConfig of TRIBES) {
      console.log(`\n🏘️  Creating: ${tribeConfig.name}`);
      
      const tribe = await prisma.tribe.create({
        data: {
          name: tribeConfig.name,
          ownerId: owner.id,
        }
      });
      
      // Add owner as member
      await prisma.tribeMember.create({
        data: {
          tribeId: tribe.id,
          userId: owner.id,
          invitedBy: owner.id,
          acceptedAt: new Date(),
        }
      });
      
      // Add other members
      for (const memberAppleId of tribeConfig.members) {
        const memberId = userMap[memberAppleId];
        await prisma.tribeMember.create({
          data: {
            tribeId: tribe.id,
            userId: memberId,
            invitedBy: owner.id,
            acceptedAt: new Date(),
          }
        });
      }
      
      // Create messages
      for (const [index, msgConfig] of tribeConfig.messages.entries()) {
        const fromUserId = userMap[msgConfig.from];
        await prisma.tribeMessage.create({
          data: {
            tribeId: tribe.id,
            userId: fromUserId,
            message: msgConfig.text,
            createdAt: new Date(Date.now() - (tribeConfig.messages.length - index) * 60 * 60 * 1000),
          }
        });
      }
      
      // Create proposals
      for (const proposalConfig of tribeConfig.proposals) {
        const fromUserId = userMap[proposalConfig.from];
        
        const item = await prisma.tribeItem.create({
          data: {
            tribeId: tribe.id,
            createdBy: fromUserId,
            itemType: proposalConfig.itemType,
            data: proposalConfig.data,
          }
        });
        
        for (const recipientAppleId of proposalConfig.to) {
          const recipientUserId = userMap[recipientAppleId];
          const recipientMember = await prisma.tribeMember.findFirst({
            where: { tribeId: tribe.id, userId: recipientUserId }
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
      }
      
      results.push({
        name: tribe.name,
        id: tribe.id,
        members: tribeConfig.members.length + 1, // +1 for owner
        messages: tribeConfig.messages.length,
        proposals: tribeConfig.proposals.length
      });
    }
    
    res.json({
      success: true,
      owner: owner.appleUserId,
      tribes: results
    });
    
  } catch (error) {
    console.error('❌ Seed error:', error);
    res.status(500).json({ error: error.message });
  }
}
