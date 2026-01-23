/**
 * Demo Tribes Auto-Seeding
 * 
 * Creates 3 realistic demo tribes for new users to explore.
 * Synthetic data helps users understand tribes before v1.1 launch.
 */

import express from 'express';
import { verifySessionToken } from '../src/lib/sessionAuth.js';
import { prisma } from '../src/lib/prisma.js';

const router = express.Router();

// Shared synthetic users (created once, reused for all demo users)
const SYNTHETIC_USERS = [
  { appleUserId: 'demo-sarah-spouse-001', name: 'Sarah' },
  { appleUserId: 'demo-mom-family-001', name: 'Mom' },
  { appleUserId: 'demo-alex-kid-001', name: 'Alex' },
  { appleUserId: 'demo-jordan-manager-001', name: 'Jordan' },
  { appleUserId: 'demo-casey-teammate-001', name: 'Casey' },
  { appleUserId: 'demo-morgan-designer-001', name: 'Morgan' },
  { appleUserId: 'demo-taylor-roommate-001', name: 'Taylor' },
  { appleUserId: 'demo-jamie-roommate-002', name: 'Jamie' },
  { appleUserId: 'demo-chris-roommate-003', name: 'Chris' },
];

// Demo tribe templates
const DEMO_TRIBES = [
  {
    name: '🏠 My Family',
    members: ['demo-sarah-spouse-001', 'demo-mom-family-001', 'demo-alex-kid-001'],
    messages: [
      { from: 'demo-sarah-spouse-001', text: 'Can someone pick up milk on the way home? 🥛' },
      { from: 'demo-mom-family-001', text: 'Dinner at our place Sunday at 6pm? 🍝' },
      { from: 'demo-alex-kid-001', text: 'Need help with homework tonight 📚' },
    ],
    proposals: [
      { from: 'demo-sarah-spouse-001', type: 'grocery', data: { name: 'Milk' } },
      { from: 'demo-mom-family-001', type: 'appointment', data: { title: 'Sunday Family Dinner', datetime: getNextSunday6PM() } },
    ]
  },
  {
    name: '💼 Work Team',
    members: ['demo-jordan-manager-001', 'demo-casey-teammate-001', 'demo-morgan-designer-001'],
    messages: [
      { from: 'demo-jordan-manager-001', text: 'Team standup moved to 10am tomorrow 📅' },
      { from: 'demo-casey-teammate-001', text: "I'll handle the client presentation 💪" },
      { from: 'demo-morgan-designer-001', text: 'New designs ready for review! 🎨' },
    ],
    proposals: [
      { from: 'demo-jordan-manager-001', type: 'task', data: { title: 'Review Q1 Budget', priority: 'high' } },
      { from: 'demo-casey-teammate-001', type: 'appointment', data: { title: 'Client Meeting', datetime: getNextThursday2PM() } },
    ]
  },
  {
    name: '🏘️ Roommates',
    members: ['demo-taylor-roommate-001', 'demo-jamie-roommate-002', 'demo-chris-roommate-003'],
    messages: [
      { from: 'demo-taylor-roommate-001', text: 'Whose turn is it for dishes? 🍽️' },
      { from: 'demo-jamie-roommate-002', text: 'Having friends over Friday night 🎉' },
      { from: 'demo-chris-roommate-003', text: 'Rent is due on the 1st! 💰' },
    ],
    proposals: [
      { from: 'demo-taylor-roommate-001', type: 'routine', data: { title: 'Clean Kitchen', frequency: 'weekly' } },
      { from: 'demo-jamie-roommate-002', type: 'grocery', data: { name: 'Toilet Paper' } },
    ]
  }
];

/**
 * POST /tribes/demo/seed
 * Auto-creates demo tribes for a user
 */
router.post('/seed', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    // Check if user already has tribes (don't double-seed)
    const existingTribes = await prisma.tribe.count({
      where: {
        members: {
          some: {
            userId,
            leftAt: null,
          }
        },
        deletedAt: null,
      }
    });

    if (existingTribes > 0) {
      return res.json({ 
        message: 'User already has tribes', 
        count: existingTribes,
        skipped: true 
      });
    }

    console.log(`🎬 Creating demo tribes for user ${userId}`);

    // Ensure synthetic users exist
    for (const synthUser of SYNTHETIC_USERS) {
      await prisma.user.upsert({
        where: { appleUserId: synthUser.appleUserId },
        update: { lastActiveAt: new Date() },
        create: { 
          appleUserId: synthUser.appleUserId,
          lastActiveAt: new Date()
        },
      });
    }

    const createdTribes = [];

    // Create each demo tribe
    for (const template of DEMO_TRIBES) {
      // Get synthetic user IDs
      const syntheticUsers = await prisma.user.findMany({
        where: {
          appleUserId: { in: template.members }
        },
        select: { id: true, appleUserId: true }
      });

      // Create tribe with user as owner
      const tribe = await prisma.tribe.create({
        data: {
          name: template.name,
          ownerId: userId,
          members: {
            create: [
              // Real user (owner)
              {
                userId,
                invitedBy: userId,
                acceptedAt: new Date(),
                permissions: {
                  create: {
                    canAddTasks: true,
                    canRemoveTasks: true,
                    canAddRoutines: true,
                    canRemoveRoutines: true,
                    canAddAppointments: true,
                    canRemoveAppointments: true,
                    canAddGroceries: true,
                    canRemoveGroceries: true,
                  }
                }
              },
              // Synthetic members
              ...syntheticUsers.map(su => ({
                userId: su.id,
                invitedBy: userId,
                acceptedAt: new Date(), // Auto-accepted for demo
                permissions: {
                  create: {
                    canAddTasks: true,
                    canRemoveTasks: false,
                    canAddRoutines: true,
                    canRemoveRoutines: false,
                    canAddAppointments: true,
                    canRemoveAppointments: false,
                    canAddGroceries: true,
                    canRemoveGroceries: false,
                  }
                }
              }))
            ]
          }
        },
        include: {
          members: true
        }
      });

      // Add messages
      for (const msg of template.messages) {
        const sender = syntheticUsers.find(su => su.appleUserId === msg.from);
        if (sender) {
          await prisma.tribeMessage.create({
            data: {
              tribeId: tribe.id,
              userId: sender.id,
              message: msg.text,
              createdAt: randomRecentDate(),
            }
          });
        }
      }

      // Add proposals
      const userMembership = tribe.members.find(m => m.userId === userId);
      for (const prop of template.proposals) {
        const sender = syntheticUsers.find(su => su.appleUserId === prop.from);
        if (sender && userMembership) {
          // Create tribe item
          const item = await prisma.tribeItem.create({
            data: {
              tribeId: tribe.id,
              createdBy: sender.id,
              itemType: prop.type,
              data: prop.data,
            }
          });

          // Create proposal for real user
          await prisma.tribeProposal.create({
            data: {
              itemId: item.id,
              recipientId: userMembership.id,
              state: 'proposed',
              createdAt: randomRecentDate(),
            }
          });
        }
      }

      createdTribes.push({
        id: tribe.id,
        name: tribe.name,
        memberCount: tribe.members.length,
      });

      console.log(`  ✅ Created: ${template.name}`);
    }

    return res.json({
      success: true,
      message: `Created ${createdTribes.length} demo tribes`,
      tribes: createdTribes,
    });

  } catch (error) {
    console.error('ERROR /tribes/demo/seed:', error);
    return res.status(500).json({ error: 'Failed to create demo tribes' });
  }
});

/**
 * GET /tribes/demo/check
 * Check if user has demo tribes
 */
router.get('/check', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    const tribes = await prisma.tribe.findMany({
      where: {
        members: {
          some: {
            userId,
            leftAt: null,
          }
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      }
    });

    const hasTribes = tribes.length > 0;
    const needsDemo = tribes.length === 0;

    return res.json({
      hasTribes,
      needsDemo,
      count: tribes.length,
      tribes: tribes,
    });

  } catch (error) {
    console.error('ERROR /tribes/demo/check:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function randomRecentDate() {
  const now = new Date();
  const hoursAgo = Math.floor(Math.random() * 48); // 0-48 hours ago
  return new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));
}

function getNextSunday6PM() {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(18, 0, 0, 0);
  return nextSunday.toISOString();
}

function getNextThursday2PM() {
  const now = new Date();
  const daysUntilThursday = (4 - now.getDay() + 7) % 7 || 7;
  const nextThursday = new Date(now);
  nextThursday.setDate(now.getDate() + daysUntilThursday);
  nextThursday.setHours(14, 0, 0, 0);
  return nextThursday.toISOString();
}

export default router;
