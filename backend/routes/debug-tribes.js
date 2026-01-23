/**
 * Debug endpoint to verify tribes exist
 * GET /api/debug/tribes
 */

import { prisma } from '../src/lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const tribes = await prisma.tribe.findMany({
      include: {
        members: {
          select: {
            userId: true,
            acceptedAt: true
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    const summary = tribes.map(t => ({
      id: t.id,
      name: t.name,
      ownerId: t.ownerId,
      memberCount: t.members.length,
      acceptedMembers: t.members.filter(m => m.acceptedAt).length,
      hasMessages: t.messages.length > 0,
      createdAt: t.createdAt
    }));
    
    res.json({
      totalTribes: tribes.length,
      tribes: summary
    });
    
  } catch (error) {
    console.error('Debug tribes error:', error);
    res.status(500).json({ error: error.message });
  }
}
