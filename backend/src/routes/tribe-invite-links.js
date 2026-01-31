/**
 * Tribe Invite Links Routes
 * 
 * Handles shareable invite links for tribes.
 */

import express from 'express';
import crypto from 'crypto';
import { verifySessionToken } from '../lib/sessionAuth.js';
import { prisma } from '../lib/prisma.js';
import { sendTribeInviteSMS, isSMSEnabled } from '../services/smsService.js';

const router = express.Router();

/**
 * POST /tribes/:tribeId/invite-link
 * 
 * Generate a shareable invite link for a tribe.
 */
router.post('/:tribeId/invite-link', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    const { tribeId } = req.params;
    const { maxUses, expiresInDays } = req.body;
    
    // Verify user is a member of the tribe
    const membership = await prisma.tribeMember.findUnique({
      where: {
        tribeId_userId: { tribeId, userId },
      },
      include: {
        tribe: true,
      },
    });
    
    if (!membership || membership.leftAt) {
      return res.status(403).json({ error: 'Not a member of this tribe' });
    }
    
    // Generate unique token
    const token = crypto.randomBytes(16).toString('hex');
    
    // Calculate expiry
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }
    
    // Create invite token
    const inviteToken = await prisma.tribeInviteToken.create({
      data: {
        tribeId,
        token,
        createdBy: userId,
        maxUses: maxUses || null,
        expiresAt,
      },
    });
    
    const baseUrl = process.env.WEB_APP_URL || 'https://helpem.ai';
    const inviteUrl = `${baseUrl}/join/${token}`;
    
    console.log(`✅ Invite link created for tribe ${tribeId} by user ${userId}`);
    
    return res.json({
      success: true,
      token: inviteToken.token,
      url: inviteUrl,
      expiresAt: inviteToken.expiresAt,
      maxUses: inviteToken.maxUses,
    });
    
  } catch (err) {
    console.error('Error creating invite link:', err);
    return res.status(500).json({ error: 'Failed to create invite link' });
  }
});

/**
 * GET /tribes/join/:token
 * 
 * Get tribe info for an invite token (for landing page).
 */
router.get('/join/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const inviteToken = await prisma.tribeInviteToken.findUnique({
      where: { token },
      include: {
        tribe: true,
      },
    });
    
    if (!inviteToken) {
      return res.status(404).json({ error: 'Invalid invite link' });
    }
    
    // Check if expired
    if (inviteToken.expiresAt && new Date() > inviteToken.expiresAt) {
      return res.status(410).json({ error: 'Invite link has expired' });
    }
    
    // Check if max uses reached
    if (inviteToken.maxUses && inviteToken.usedCount >= inviteToken.maxUses) {
      return res.status(410).json({ error: 'Invite link has reached maximum uses' });
    }
    
    // Check if tribe still exists
    if (inviteToken.tribe.deletedAt) {
      return res.status(410).json({ error: 'This tribe no longer exists' });
    }
    
    // Get member count
    const memberCount = await prisma.tribeMember.count({
      where: {
        tribeId: inviteToken.tribeId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });
    
    return res.json({
      valid: true,
      tribe: {
        id: inviteToken.tribe.id,
        name: inviteToken.tribe.name,
        memberCount,
      },
    });
    
  } catch (err) {
    console.error('Error validating invite token:', err);
    return res.status(500).json({ error: 'Failed to validate invite' });
  }
});

/**
 * POST /tribes/join/:token
 * 
 * Accept an invite and join the tribe.
 */
router.post('/join/:token', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    const { token } = req.params;
    
    const inviteToken = await prisma.tribeInviteToken.findUnique({
      where: { token },
      include: {
        tribe: true,
      },
    });
    
    if (!inviteToken) {
      return res.status(404).json({ error: 'Invalid invite link' });
    }
    
    // Check if expired
    if (inviteToken.expiresAt && new Date() > inviteToken.expiresAt) {
      return res.status(410).json({ error: 'Invite link has expired' });
    }
    
    // Check if max uses reached
    if (inviteToken.maxUses && inviteToken.usedCount >= inviteToken.maxUses) {
      return res.status(410).json({ error: 'Invite link has reached maximum uses' });
    }
    
    // Check if tribe still exists
    if (inviteToken.tribe.deletedAt) {
      return res.status(410).json({ error: 'This tribe no longer exists' });
    }
    
    // Check if already a member
    const existingMember = await prisma.tribeMember.findUnique({
      where: {
        tribeId_userId: {
          tribeId: inviteToken.tribeId,
          userId,
        },
      },
    });
    
    if (existingMember && !existingMember.leftAt) {
      return res.status(400).json({ error: 'Already a member of this tribe' });
    }
    
    // Add as member (or rejoin if previously left)
    if (existingMember) {
      await prisma.tribeMember.update({
        where: { id: existingMember.id },
        data: {
          acceptedAt: new Date(),
          leftAt: null,
        },
      });
    } else {
      await prisma.tribeMember.create({
        data: {
          tribeId: inviteToken.tribeId,
          userId,
          invitedBy: inviteToken.createdBy,
          acceptedAt: new Date(),
        },
      });
    }
    
    // Increment used count
    await prisma.tribeInviteToken.update({
      where: { id: inviteToken.id },
      data: {
        usedCount: { increment: 1 },
      },
    });
    
    console.log(`✅ User ${userId} joined tribe ${inviteToken.tribeId} via invite link`);
    
    return res.json({
      success: true,
      tribe: {
        id: inviteToken.tribe.id,
        name: inviteToken.tribe.name,
      },
    });
    
  } catch (err) {
    console.error('Error joining via invite link:', err);
    return res.status(500).json({ error: 'Failed to join tribe' });
  }
});

/**
 * POST /tribes/:tribeId/invite-sms
 * 
 * Send an SMS invitation to a phone number.
 */
router.post('/:tribeId/invite-sms', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    const { tribeId } = req.params;
    const { phoneNumber, inviterName } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Verify user is a member of the tribe
    const membership = await prisma.tribeMember.findUnique({
      where: {
        tribeId_userId: { tribeId, userId },
      },
      include: {
        tribe: true,
      },
    });
    
    if (!membership || membership.leftAt) {
      return res.status(403).json({ error: 'Not a member of this tribe' });
    }
    
    // Check if SMS is enabled
    if (!isSMSEnabled()) {
      return res.status(503).json({ 
        error: 'SMS service not configured',
        message: 'Please contact support to enable SMS invitations'
      });
    }
    
    // Generate invite token
    const token = crypto.randomBytes(16).toString('hex');
    
    // Create invite token (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await prisma.tribeInviteToken.create({
      data: {
        tribeId,
        token,
        createdBy: userId,
        maxUses: 1, // Single use for SMS invites
        expiresAt,
      },
    });
    
    // Send SMS
    const senderName = inviterName || 'Someone';
    await sendTribeInviteSMS(phoneNumber, senderName, membership.tribe.name, token);
    
    // Also create a pending invitation record
    await prisma.pendingTribeInvitation.upsert({
      where: {
        tribeId_contactIdentifier: {
          tribeId,
          contactIdentifier: phoneNumber,
        },
      },
      update: {
        invitedBy: userId,
        inviterName: senderName,
        expiresAt,
        state: 'pending',
      },
      create: {
        tribeId,
        invitedBy: userId,
        contactIdentifier: phoneNumber,
        contactType: 'phone',
        inviterName: senderName,
        expiresAt,
      },
    });
    
    console.log(`📱 SMS invite sent for tribe ${tribeId} to ${phoneNumber}`);
    
    return res.json({
      success: true,
      message: 'Invitation sent via SMS',
    });
    
  } catch (err) {
    console.error('Error sending SMS invite:', err);
    return res.status(500).json({ error: 'Failed to send SMS invitation' });
  }
});

export default router;
