/**
 * Debug endpoint to see user's complete state
 * GET /api/debug/user-state
 */

import { prisma } from '../src/lib/prisma.js';
import { verifySessionToken } from '../src/lib/sessionAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(401).json({ error: 'Unauthorized', details: session.error });
    }

    const userId = session.session.userId;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        appleUserId: true,
        createdAt: true,
        lastActiveAt: true,
      }
    });

    // Get all tribes (including soft-deleted)
    const allTribes = await prisma.tribe.findMany({
      where: {
        members: {
          some: {
            userId,
          }
        }
      },
      include: {
        members: {
          where: {
            userId
          },
          select: {
            id: true,
            acceptedAt: true,
            leftAt: true,
          }
        }
      }
    });

    // Get active tribes
    const activeTribes = await prisma.tribe.findMany({
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
          select: {
            id: true,
            userId: true,
            acceptedAt: true,
          }
        }
      }
    });

    // Get tribe memberships
    const memberships = await prisma.tribeMember.findMany({
      where: { userId },
      include: {
        tribe: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
          }
        }
      }
    });

    // Check if synthetic users exist
    const syntheticUsers = await prisma.user.findMany({
      where: {
        appleUserId: {
          startsWith: 'demo-'
        }
      },
      select: {
        id: true,
        appleUserId: true,
      }
    });

    res.json({
      user,
      tribes: {
        all: allTribes.length,
        active: activeTribes.length,
        activeList: activeTribes.map(t => ({
          id: t.id,
          name: t.name,
          memberCount: t.members.length,
          createdAt: t.createdAt,
        }))
      },
      memberships: {
        total: memberships.length,
        active: memberships.filter(m => !m.leftAt).length,
        list: memberships.map(m => ({
          tribeId: m.tribeId,
          tribeName: m.tribe?.name,
          tribeDeleted: !!m.tribe?.deletedAt,
          acceptedAt: m.acceptedAt,
          leftAt: m.leftAt,
        }))
      },
      syntheticUsers: {
        count: syntheticUsers.length,
        exist: syntheticUsers.length > 0,
      },
      readyForAutoSeed: activeTribes.length === 0 && syntheticUsers.length > 0,
    });
    
  } catch (error) {
    console.error('Debug user state error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
