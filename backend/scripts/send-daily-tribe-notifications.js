#!/usr/bin/env node

/**
 * Daily Tribe Message Notifications
 * 
 * Runs once per day (e.g., 9am local time)
 * Checks for users with unread tribe messages
 * Sends push notification if unread messages exist
 * 
 * Schedule in Railway:
 * - Cron: 0 9 * * * (9am daily)
 * - Command: node backend/scripts/send-daily-tribe-notifications.js
 */

const { query } = require('../src/lib/db');

// Import your push notification service (e.g., Firebase, APNS)
// For now, we'll log what would be sent
async function sendPushNotification(userId, title, body, data) {
  // TODO: Implement actual push notification
  // Using Firebase Cloud Messaging or Apple Push Notification Service
  
  console.log(`📱 Would send push to user ${userId}:`);
  console.log(`   Title: ${title}`);
  console.log(`   Body: ${body}`);
  console.log(`   Data:`, data);
  
  // Example Firebase implementation:
  /*
  const admin = require('firebase-admin');
  
  const message = {
    notification: {
      title,
      body,
    },
    data,
    token: await getUserPushToken(userId),
  };
  
  await admin.messaging().send(message);
  */
}

async function sendDailyTribeNotifications() {
  console.log('🔔 Starting daily tribe message notifications...');
  console.log(`   Time: ${new Date().toISOString()}`);
  
  try {
    // Get all users with unread messages
    const result = await query(`
      SELECT * FROM get_users_with_unread_messages()
    `);
    
    console.log(`📊 Found ${result.rows.length} users with unread messages`);
    
    if (result.rows.length === 0) {
      console.log('✅ No notifications to send');
      return;
    }
    
    // Group by user (they might have unread in multiple tribes)
    const userGroups = {};
    for (const row of result.rows) {
      if (!userGroups[row.user_id]) {
        userGroups[row.user_id] = [];
      }
      userGroups[row.user_id].push({
        tribeId: row.tribe_id,
        tribeName: row.tribe_name,
        unreadCount: parseInt(row.unread_count),
        lastReadAt: row.last_read_at,
      });
    }
    
    // Send notifications
    let sentCount = 0;
    for (const [userId, tribes] of Object.entries(userGroups)) {
      const totalUnread = tribes.reduce((sum, t) => sum + t.unreadCount, 0);
      
      // Create notification message
      let title, body;
      
      if (tribes.length === 1) {
        // Single tribe
        const tribe = tribes[0];
        title = `${tribe.unreadCount} unread message${tribe.unreadCount > 1 ? 's' : ''} in ${tribe.tribeName}`;
        body = 'Tap to catch up with your tribe';
      } else {
        // Multiple tribes
        title = `${totalUnread} unread messages across ${tribes.length} tribes`;
        body = tribes.map(t => `${t.tribeName} (${t.unreadCount})`).join(', ');
      }
      
      // Send notification
      await sendPushNotification(
        userId,
        title,
        body,
        {
          type: 'tribe_messages_unread',
          tribes: JSON.stringify(tribes.map(t => ({
            tribeId: t.tribeId,
            tribeName: t.tribeName,
            unreadCount: t.unreadCount,
          }))),
        }
      );
      
      sentCount++;
      
      // Log details
      console.log(`\n👤 User ${userId}:`);
      for (const tribe of tribes) {
        console.log(`   - ${tribe.tribeName}: ${tribe.unreadCount} unread`);
        console.log(`     (last read: ${new Date(tribe.lastReadAt).toLocaleString()})`);
      }
    }
    
    console.log(`\n✅ Sent ${sentCount} notifications`);
    
    // Log summary to database (optional)
    await query(`
      INSERT INTO notification_logs (type, sent_count, created_at)
      VALUES ('daily_tribe_unread', $1, NOW())
    `, [sentCount]);
    
  } catch (error) {
    console.error('❌ Error sending daily tribe notifications:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  sendDailyTribeNotifications()
    .then(() => {
      console.log('\n🎉 Daily tribe notifications complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n💥 Failed:', err);
      process.exit(1);
    });
}

module.exports = { sendDailyTribeNotifications };
