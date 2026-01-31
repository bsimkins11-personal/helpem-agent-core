/**
 * Google Calendar API Routes
 * 
 * Handles OAuth flow and calendar CRUD operations.
 */

import express from 'express';
import crypto from 'crypto';
import { verifySessionToken } from '../lib/sessionAuth.js';
import { prisma } from '../lib/prisma.js';
import { encryptToken, decryptToken } from '../lib/tokenEncryption.js';
import {
  getAuthUrl,
  exchangeCodeForTokens,
  getUserEmail,
  revokeTokens,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../lib/googleCalendarClient.js';

const router = express.Router();

// Store OAuth state tokens temporarily (in production, use Redis)
const stateTokens = new Map();
const STATE_TOKEN_EXPIRY = 10 * 60 * 1000; // 10 minutes

/**
 * GET /google/oauth/start
 * 
 * Initiates the OAuth flow by returning the authorization URL.
 */
router.get('/oauth/start', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    
    // Check if already connected
    const existing = await prisma.googleConnection.findUnique({
      where: { userId },
    });
    
    if (existing) {
      return res.status(400).json({ 
        error: 'Already connected to Google Calendar',
        connected: true,
        email: existing.googleEmail,
      });
    }
    
    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    stateTokens.set(state, {
      userId,
      createdAt: Date.now(),
    });
    
    // Clean up old state tokens
    for (const [key, value] of stateTokens.entries()) {
      if (Date.now() - value.createdAt > STATE_TOKEN_EXPIRY) {
        stateTokens.delete(key);
      }
    }
    
    const authUrl = getAuthUrl(state);
    
    return res.json({ authUrl, state });
    
  } catch (err) {
    console.error('Error starting Google OAuth:', err);
    return res.status(500).json({ error: 'Failed to start OAuth flow' });
  }
});

/**
 * GET /google/oauth/callback
 * 
 * Handles the OAuth callback from Google.
 * Exchanges code for tokens and stores them.
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    
    // Handle OAuth errors
    if (oauthError) {
      console.error('OAuth error from Google:', oauthError);
      return res.redirect(`${process.env.WEB_APP_URL || 'https://app.helpem.ai'}/connections?error=oauth_denied`);
    }
    
    if (!code || !state) {
      return res.redirect(`${process.env.WEB_APP_URL || 'https://app.helpem.ai'}/connections?error=missing_params`);
    }
    
    // Verify state token
    const stateData = stateTokens.get(state);
    if (!stateData) {
      return res.redirect(`${process.env.WEB_APP_URL || 'https://app.helpem.ai'}/connections?error=invalid_state`);
    }
    
    // Check expiry
    if (Date.now() - stateData.createdAt > STATE_TOKEN_EXPIRY) {
      stateTokens.delete(state);
      return res.redirect(`${process.env.WEB_APP_URL || 'https://app.helpem.ai'}/connections?error=state_expired`);
    }
    
    const userId = stateData.userId;
    stateTokens.delete(state);
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    
    // Get user's Google email
    const googleEmail = await getUserEmail(tokens.access_token);
    
    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);
    
    // Store connection
    await prisma.googleConnection.create({
      data: {
        userId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: new Date(tokens.expiry_date),
        googleEmail,
        scope: tokens.scope || 'https://www.googleapis.com/auth/calendar',
      },
    });
    
    console.log(`✅ Google Calendar connected for user ${userId} (${googleEmail})`);
    
    // Redirect back to connections page with success
    return res.redirect(`${process.env.WEB_APP_URL || 'https://app.helpem.ai'}/connections?success=google_connected`);
    
  } catch (err) {
    console.error('Error in Google OAuth callback:', err);
    return res.redirect(`${process.env.WEB_APP_URL || 'https://app.helpem.ai'}/connections?error=callback_failed`);
  }
});

/**
 * POST /google/oauth/disconnect
 * 
 * Disconnects Google Calendar by revoking tokens and deleting the connection.
 */
router.post('/oauth/disconnect', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    
    const connection = await prisma.googleConnection.findUnique({
      where: { userId },
    });
    
    if (!connection) {
      return res.status(404).json({ error: 'Not connected to Google Calendar' });
    }
    
    // Try to revoke tokens (don't fail if this errors)
    try {
      const accessToken = decryptToken(connection.accessToken);
      await revokeTokens(accessToken);
    } catch (revokeError) {
      console.warn('Failed to revoke Google tokens:', revokeError.message);
      // Continue anyway - we'll delete the connection
    }
    
    // Delete the connection
    await prisma.googleConnection.delete({
      where: { userId },
    });
    
    console.log(`✅ Google Calendar disconnected for user ${userId}`);
    
    return res.json({ success: true, message: 'Google Calendar disconnected' });
    
  } catch (err) {
    console.error('Error disconnecting Google Calendar:', err);
    return res.status(500).json({ error: 'Failed to disconnect' });
  }
});

/**
 * GET /google/connection
 * 
 * Get the current user's Google Calendar connection status.
 */
router.get('/connection', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    
    const connection = await prisma.googleConnection.findUnique({
      where: { userId },
      select: {
        googleEmail: true,
        syncEnabled: true,
        lastSyncedAt: true,
        createdAt: true,
      },
    });
    
    if (!connection) {
      return res.json({ connected: false });
    }
    
    return res.json({
      connected: true,
      email: connection.googleEmail,
      syncEnabled: connection.syncEnabled,
      lastSyncedAt: connection.lastSyncedAt,
      connectedAt: connection.createdAt,
    });
    
  } catch (err) {
    console.error('Error getting Google connection:', err);
    return res.status(500).json({ error: 'Failed to get connection status' });
  }
});

/**
 * GET /google/calendar/events
 * 
 * List events from the user's Google Calendar.
 */
router.get('/calendar/events', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    
    // Parse query params
    const timeMin = req.query.timeMin ? new Date(req.query.timeMin) : undefined;
    const timeMax = req.query.timeMax ? new Date(req.query.timeMax) : undefined;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults) : undefined;
    
    const events = await listEvents(userId, { timeMin, timeMax, maxResults });
    
    // Transform to helpem format
    const appointments = events.map(event => ({
      id: event.id,
      googleEventId: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description || null,
      location: event.location || null,
      datetime: event.start.dateTime || event.start.date,
      endDatetime: event.end.dateTime || event.end.date,
      isAllDay: !event.start.dateTime,
      source: 'google_calendar',
      htmlLink: event.htmlLink,
    }));
    
    // Update last synced
    await prisma.googleConnection.update({
      where: { userId },
      data: { lastSyncedAt: new Date() },
    });
    
    return res.json({ events: appointments });
    
  } catch (err) {
    if (err.message === 'User not connected to Google Calendar') {
      return res.status(404).json({ error: 'Not connected to Google Calendar' });
    }
    console.error('Error listing Google Calendar events:', err);
    return res.status(500).json({ error: 'Failed to list events' });
  }
});

/**
 * POST /google/calendar/events
 * 
 * Create a new event in the user's Google Calendar.
 */
router.post('/calendar/events', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    const { title, datetime, description, location, durationMinutes, timezone } = req.body;
    
    if (!title || !datetime) {
      return res.status(400).json({ error: 'Title and datetime are required' });
    }
    
    const event = await createEvent(userId, {
      title,
      datetime,
      description,
      location,
      durationMinutes: durationMinutes || 60,
      timezone,
    });
    
    return res.json({
      success: true,
      event: {
        id: event.id,
        googleEventId: event.id,
        title: event.summary,
        datetime: event.start.dateTime || event.start.date,
        htmlLink: event.htmlLink,
      },
    });
    
  } catch (err) {
    if (err.message === 'User not connected to Google Calendar') {
      return res.status(404).json({ error: 'Not connected to Google Calendar' });
    }
    console.error('Error creating Google Calendar event:', err);
    return res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * PATCH /google/calendar/events/:eventId
 * 
 * Update an event in the user's Google Calendar.
 */
router.patch('/calendar/events/:eventId', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    const { eventId } = req.params;
    const { title, datetime, description, location, durationMinutes, timezone } = req.body;
    
    const event = await updateEvent(userId, eventId, {
      title,
      datetime,
      description,
      location,
      durationMinutes,
      timezone,
    });
    
    return res.json({
      success: true,
      event: {
        id: event.id,
        googleEventId: event.id,
        title: event.summary,
        datetime: event.start.dateTime || event.start.date,
        htmlLink: event.htmlLink,
      },
    });
    
  } catch (err) {
    if (err.message === 'User not connected to Google Calendar') {
      return res.status(404).json({ error: 'Not connected to Google Calendar' });
    }
    console.error('Error updating Google Calendar event:', err);
    return res.status(500).json({ error: 'Failed to update event' });
  }
});

/**
 * DELETE /google/calendar/events/:eventId
 * 
 * Delete an event from the user's Google Calendar.
 */
router.delete('/calendar/events/:eventId', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    
    const userId = session.session.userId;
    const { eventId } = req.params;
    
    await deleteEvent(userId, eventId);
    
    return res.json({ success: true, message: 'Event deleted' });
    
  } catch (err) {
    if (err.message === 'User not connected to Google Calendar') {
      return res.status(404).json({ error: 'Not connected to Google Calendar' });
    }
    console.error('Error deleting Google Calendar event:', err);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
