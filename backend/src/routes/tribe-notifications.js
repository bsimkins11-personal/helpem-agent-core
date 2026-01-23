const express = require('express');
const router = express.Router();
const { verifySessionToken } = require('../lib/sessionAuth');
const { query } = require('../lib/db');

/**
 * GET /tribes/:tribeId/unread-count
 * Get count of unread messages in a tribe
 */
router.get('/:tribeId/unread-count', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.userId;
    const { tribeId } = req.params;
    
    // Get unread count
    const result = await query(`
      SELECT get_unread_message_count($1, $2) as unread_count
    `, [userId, tribeId]);
    
    const unreadCount = result.rows[0]?.unread_count || 0;
    
    return res.json({ 
      unreadCount,
      tribeId 
    });
    
  } catch (error) {
    console.error('ERROR GET /tribes/:tribeId/unread-count:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /tribes/:tribeId/mark-read
 * Mark all messages in tribe as read
 */
router.post('/:tribeId/mark-read', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.userId;
    const { tribeId } = req.params;
    
    // Verify user is member of tribe
    const memberCheck = await query(`
      SELECT id FROM tribe_members
      WHERE user_id = $1 
        AND tribe_id = $2
        AND accepted_at IS NOT NULL
        AND left_at IS NULL
    `, [userId, tribeId]);
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this tribe' });
    }
    
    // Mark as read
    await query(`
      SELECT mark_tribe_messages_read($1, $2)
    `, [userId, tribeId]);
    
    console.log(`✅ Marked messages as read for user ${userId} in tribe ${tribeId}`);
    
    return res.json({ 
      success: true,
      markedReadAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('ERROR POST /tribes/:tribeId/mark-read:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /tribes/unread-summary
 * Get summary of all unread messages across all tribes
 */
router.get('/unread-summary', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.userId;
    
    // Get unread counts for all tribes
    const result = await query(`
      SELECT 
        tm.tribe_id,
        t.name as tribe_name,
        COUNT(tmsg.id) as unread_count,
        MAX(tmsg.created_at) as latest_message_at
      FROM tribe_members tm
      JOIN tribes t ON t.id = tm.tribe_id
      LEFT JOIN tribe_messages tmsg ON 
        tmsg.tribe_id = tm.tribe_id
        AND tmsg.created_at > tm.last_read_messages_at
        AND tmsg.deleted_at IS NULL
        AND tmsg.user_id != tm.user_id
      WHERE tm.user_id = $1
        AND tm.accepted_at IS NOT NULL
        AND tm.left_at IS NULL
        AND t.deleted_at IS NULL
      GROUP BY tm.tribe_id, t.name, tm.last_read_messages_at
      ORDER BY MAX(tmsg.created_at) DESC NULLS LAST
    `, [userId]);
    
    const tribes = result.rows.map(row => ({
      tribeId: row.tribe_id,
      tribeName: row.tribe_name,
      unreadCount: parseInt(row.unread_count) || 0,
      latestMessageAt: row.latest_message_at,
    }));
    
    const totalUnread = tribes.reduce((sum, t) => sum + t.unreadCount, 0);
    
    return res.json({
      totalUnread,
      tribes,
    });
    
  } catch (error) {
    console.error('ERROR GET /tribes/unread-summary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /tribes/:tribeId/notification-preferences
 * Update notification preferences for tribe
 */
router.patch('/:tribeId/notification-preferences', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.userId;
    const { tribeId } = req.params;
    const { dailyUnreadNotif } = req.body;
    
    if (typeof dailyUnreadNotif !== 'boolean') {
      return res.status(400).json({ error: 'dailyUnreadNotif must be boolean' });
    }
    
    // Update preference
    const result = await query(`
      UPDATE tribe_members
      SET daily_unread_notif = $1
      WHERE user_id = $2
        AND tribe_id = $3
        AND accepted_at IS NOT NULL
        AND left_at IS NULL
      RETURNING id, daily_unread_notif
    `, [dailyUnreadNotif, userId, tribeId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tribe membership not found' });
    }
    
    console.log(`✅ Updated daily notification pref for user ${userId} in tribe ${tribeId}: ${dailyUnreadNotif}`);
    
    return res.json({
      success: true,
      dailyUnreadNotif: result.rows[0].daily_unread_notif,
    });
    
  } catch (error) {
    console.error('ERROR PATCH /tribes/:tribeId/notification-preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
