/**
 * Demo Tribes Cleanup Utility
 * 
 * Provides endpoints to clean up or migrate demo tribes.
 * Useful for handling old synthetic tribes from previous seed scripts.
 */

import express from 'express';
import { verifySessionToken } from '../src/lib/sessionAuth.js';
import { prisma } from '../src/lib/prisma.js';

const router = express.Router();

const DEMO_TRIBE_NAMES = [
  '🏠 My Family',
  '💼 Work Team',
  '🏘️ Roommates'
];

const OLD_DEMO_PATTERNS = [
  'Demo Family',
  'Demo Work',
  'Demo Roommates',
  'Test Tribe',
  'Sample Tribe',
  // Add any old demo tribe names from previous scripts
];

/**
 * GET /tribes/demo/cleanup/check
 * Check if user has old demo tribes that need cleanup
 */
router.get('/check', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    // Get all user's tribes
    const allTribes = await prisma.tribe.findMany({
      where: {
        members: {
          some: {
            userId,
            leftAt: null,
          }
        },
        deletedAt: null,
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                appleUserId: true,
              }
            }
          }
        }
      }
    });

    // Identify demo tribes
    const demoTribes = allTribes.filter(tribe => {
      const isDemoName = DEMO_TRIBE_NAMES.includes(tribe.name) || 
                        OLD_DEMO_PATTERNS.some(pattern => tribe.name.includes(pattern));
      
      // Check if it has synthetic users
      const hasSyntheticMembers = tribe.members.some(m => 
        m.user.appleUserId.startsWith('demo-') || 
        m.user.appleUserId.startsWith('synthetic-')
      );
      
      return isDemoName || hasSyntheticMembers;
    });

    const realTribes = allTribes.filter(t => !demoTribes.some(dt => dt.id === t.id));

    return res.json({
      total: allTribes.length,
      demo: demoTribes.length,
      real: realTribes.length,
      demoTribes: demoTribes.map(t => ({
        id: t.id,
        name: t.name,
        memberCount: t.members.length,
      })),
      realTribes: realTribes.map(t => ({
        id: t.id,
        name: t.name,
        memberCount: t.members.length,
      })),
      needsCleanup: demoTribes.length > 3, // More than our 3 demo tribes
    });

  } catch (error) {
    console.error('ERROR /tribes/demo/cleanup/check:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /tribes/demo/cleanup/remove-duplicates
 * Remove duplicate demo tribes, keep only the 3 standard ones
 */
router.post('/remove-duplicates', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    // Get all demo tribes
    const demoTribes = await prisma.tribe.findMany({
      where: {
        members: {
          some: {
            userId,
            leftAt: null,
          }
        },
        deletedAt: null,
        OR: [
          { name: { in: [...DEMO_TRIBE_NAMES, ...OLD_DEMO_PATTERNS] } },
        ]
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                appleUserId: true,
              }
            }
          }
        }
      }
    });

    // Identify which tribes to keep (one of each type)
    const tribesGrouped = {
      family: demoTribes.filter(t => t.name.toLowerCase().includes('family')),
      work: demoTribes.filter(t => t.name.toLowerCase().includes('work')),
      roommates: demoTribes.filter(t => t.name.toLowerCase().includes('roommate')),
      other: demoTribes.filter(t => 
        !t.name.toLowerCase().includes('family') &&
        !t.name.toLowerCase().includes('work') &&
        !t.name.toLowerCase().includes('roommate')
      ),
    };

    const toDelete = [];
    
    // Keep the newest of each type, delete the rest
    Object.entries(tribesGrouped).forEach(([type, tribes]) => {
      if (tribes.length > 1) {
        // Sort by creation date, keep newest
        tribes.sort((a, b) => b.createdAt - a.createdAt);
        toDelete.push(...tribes.slice(1)); // Delete all but first (newest)
      }
    });

    // Soft delete duplicate tribes
    const deleted = [];
    for (const tribe of toDelete) {
      await prisma.tribe.update({
        where: { id: tribe.id },
        data: { deletedAt: new Date() }
      });
      deleted.push({ id: tribe.id, name: tribe.name });
    }

    return res.json({
      success: true,
      message: `Removed ${deleted.length} duplicate demo tribes`,
      deleted,
      remaining: demoTribes.length - deleted.length,
    });

  } catch (error) {
    console.error('ERROR /tribes/demo/cleanup/remove-duplicates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /tribes/demo/cleanup/remove-all-demo
 * Remove ALL demo tribes for a user (when they start using real tribes)
 */
router.post('/remove-all-demo', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    // Get all demo tribes
    const demoTribes = await prisma.tribe.findMany({
      where: {
        members: {
          some: {
            userId,
            leftAt: null,
          }
        },
        deletedAt: null,
        OR: [
          { name: { in: [...DEMO_TRIBE_NAMES, ...OLD_DEMO_PATTERNS] } },
        ]
      }
    });

    // Soft delete all demo tribes
    const deleted = [];
    for (const tribe of demoTribes) {
      await prisma.tribe.update({
        where: { id: tribe.id },
        data: { deletedAt: new Date() }
      });
      deleted.push({ id: tribe.id, name: tribe.name });
    }

    return res.json({
      success: true,
      message: `Removed ${deleted.length} demo tribes`,
      deleted,
    });

  } catch (error) {
    console.error('ERROR /tribes/demo/cleanup/remove-all-demo:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
