#!/usr/bin/env node

/**
 * Daily Tribe Digest Notifications
 * 
 * Sends a daily digest notification for each tribe with unread activity.
 * Each user receives at most ONE notification per tribe per day.
 * 
 * Run via cron: 0 9 * * * (9 AM daily)
 */

import { prisma } from '../src/lib/prisma.js';
import { sendTribeDigestNotification, isPushEnabled } from '../src/services/pushNotificationService.js';

const NOTIFICATION_TYPE = 'tribe_digest';
const HOURS_BETWEEN_DIGESTS = 24;

async function main() {
  console.log('🔔 Starting daily tribe digest...');
  
  if (!isPushEnabled()) {
    console.log('⚠️ Push notifications not configured, skipping digest');
    process.exit(0);
  }
  
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - HOURS_BETWEEN_DIGESTS);
  
  // Get all active tribe members who have digest notifications enabled
  const memberships = await prisma.tribeMember.findMany({
    where: {
      acceptedAt: { not: null },
      leftAt: null,
      digestNotifs: true,
    },
    include: {
      tribe: {
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      },
    },
  });
  
  console.log(`📋 Found ${memberships.length} members with digest enabled`);
  
  let notificationsSent = 0;
  let skipped = 0;
  
  for (const membership of memberships) {
    // Skip deleted tribes
    if (membership.tribe.deletedAt) {
      continue;
    }
    
    const { userId, tribeId, tribe } = membership;
    
    try {
      // Check if we already sent a digest for this tribe today
      const recentNotification = await prisma.notificationLog.findFirst({
        where: {
          userId,
          type: NOTIFICATION_TYPE,
          referenceId: tribeId,
          sentAt: { gte: cutoffTime },
        },
      });
      
      if (recentNotification) {
        skipped++;
        continue;
      }
      
      // Count unread messages and proposals since last digest
      const [unreadMessages, unreadProposals] = await Promise.all([
        // Count messages since cutoff
        prisma.tribeMessage.count({
          where: {
            tribeId,
            createdAt: { gte: cutoffTime },
            deletedAt: null,
            // Don't count user's own messages
            userId: { not: userId },
          },
        }),
        
        // Count pending proposals for this user
        prisma.tribeProposal.count({
          where: {
            item: { tribeId },
            recipient: { userId },
            state: 'proposed',
          },
        }),
      ]);
      
      const totalUpdates = unreadMessages + unreadProposals;
      
      // Only send if there are updates
      if (totalUpdates === 0) {
        skipped++;
        continue;
      }
      
      // Send the notification
      console.log(`📱 Sending digest to user ${userId} for tribe "${tribe.name}" (${totalUpdates} updates)`);
      
      await sendTribeDigestNotification(userId, tribe.name, totalUpdates);
      
      // Log the notification
      await prisma.notificationLog.create({
        data: {
          userId,
          type: NOTIFICATION_TYPE,
          referenceId: tribeId,
        },
      });
      
      notificationsSent++;
      
    } catch (error) {
      console.error(`❌ Failed to send digest to user ${userId}:`, error.message);
    }
  }
  
  console.log(`✅ Daily digest complete: ${notificationsSent} sent, ${skipped} skipped`);
}

// Run the script
main()
  .catch((error) => {
    console.error('❌ Daily digest failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
