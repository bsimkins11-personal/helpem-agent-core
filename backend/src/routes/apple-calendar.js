/**
 * Apple Calendar API Routes
 *
 * Handles CalDAV connection and calendar CRUD operations via iCloud.
 */

import express from 'express';
import { verifySessionToken } from '../lib/sessionAuth.js';
import { prisma } from '../lib/prisma.js';
import { encryptToken } from '../lib/tokenEncryption.js';
import {
  testConnection,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../lib/appleCalendarClient.js';

const router = express.Router();

/**
 * POST /apple/connect
 *
 * Connect Apple Calendar with Apple ID email and app-specific password.
 */
router.post('/connect', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { appleEmail, appPassword } = req.body;

    if (!appleEmail || !appPassword) {
      return res.status(400).json({ error: 'Apple ID email and app-specific password are required' });
    }

    // Check if already connected
    const existing = await prisma.appleCalendarConnection.findUnique({
      where: { userId },
    });

    if (existing) {
      return res.status(400).json({
        error: 'Already connected to Apple Calendar',
        connected: true,
        email: existing.appleEmail,
      });
    }

    // Test the connection
    let connectionResult;
    try {
      connectionResult = await testConnection(appleEmail, appPassword);
    } catch (testErr) {
      console.error('Apple Calendar connection test failed:', testErr.message);
      return res.status(400).json({
        error: 'Failed to connect to Apple Calendar. Please verify your Apple ID and app-specific password.',
      });
    }

    if (!connectionResult.success) {
      return res.status(400).json({ error: 'Could not access Apple Calendar' });
    }

    // Encrypt and store credentials
    const encryptedPassword = encryptToken(appPassword);

    await prisma.appleCalendarConnection.create({
      data: {
        userId,
        appleEmail,
        appPassword: encryptedPassword,
        caldavUrl: null,
        principalUrl: connectionResult.principalUrl,
      },
    });

    console.log(`Apple Calendar connected for user ${userId} (${appleEmail})`);

    return res.json({
      success: true,
      message: 'Apple Calendar connected',
      email: appleEmail,
      calendars: connectionResult.calendars,
    });

  } catch (err) {
    console.error('Error connecting Apple Calendar:', err);
    return res.status(500).json({ error: 'Failed to connect Apple Calendar' });
  }
});

/**
 * POST /apple/disconnect
 *
 * Disconnect Apple Calendar by deleting stored credentials.
 */
router.post('/disconnect', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    const connection = await prisma.appleCalendarConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Not connected to Apple Calendar' });
    }

    await prisma.appleCalendarConnection.delete({
      where: { userId },
    });

    console.log(`Apple Calendar disconnected for user ${userId}`);

    return res.json({ success: true, message: 'Apple Calendar disconnected' });

  } catch (err) {
    console.error('Error disconnecting Apple Calendar:', err);
    return res.status(500).json({ error: 'Failed to disconnect' });
  }
});

/**
 * GET /apple/connection
 *
 * Get the current user's Apple Calendar connection status.
 */
router.get('/connection', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    const connection = await prisma.appleCalendarConnection.findUnique({
      where: { userId },
      select: {
        appleEmail: true,
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
      email: connection.appleEmail,
      syncEnabled: connection.syncEnabled,
      lastSyncedAt: connection.lastSyncedAt,
      connectedAt: connection.createdAt,
    });

  } catch (err) {
    console.error('Error getting Apple connection:', err);
    return res.status(500).json({ error: 'Failed to get connection status' });
  }
});

/**
 * GET /apple/calendar/events
 *
 * List events from the user's Apple Calendar.
 */
router.get('/calendar/events', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    const timeMin = req.query.timeMin ? new Date(req.query.timeMin) : undefined;
    const timeMax = req.query.timeMax ? new Date(req.query.timeMax) : undefined;

    const events = await listEvents(userId, { timeMin, timeMax });

    const appointments = events.map(event => ({
      id: event.uid,
      appleEventUrl: event.calendarObjectUrl,
      title: event.summary || 'Untitled Event',
      description: event.description || null,
      location: event.location || null,
      datetime: event.start,
      endDatetime: event.end,
      isAllDay: event.isAllDay || false,
      source: 'apple_calendar',
    }));

    return res.json({ events: appointments });

  } catch (err) {
    if (err.message === 'User not connected to Apple Calendar') {
      return res.status(404).json({ error: 'Not connected to Apple Calendar' });
    }
    console.error('Error listing Apple Calendar events:', err);
    return res.status(500).json({ error: 'Failed to list events' });
  }
});

/**
 * POST /apple/calendar/events
 *
 * Create a new event in the user's Apple Calendar.
 */
router.post('/calendar/events', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { title, datetime, description, location, durationMinutes } = req.body;

    if (!title || !datetime) {
      return res.status(400).json({ error: 'Title and datetime are required' });
    }

    const event = await createEvent(userId, {
      title,
      datetime,
      description,
      location,
      durationMinutes: durationMinutes || 60,
    });

    return res.json({
      success: true,
      event: {
        id: event.uid,
        appleEventUrl: event.calendarObjectUrl,
        title: event.summary,
        datetime: event.start,
      },
    });

  } catch (err) {
    if (err.message === 'User not connected to Apple Calendar') {
      return res.status(404).json({ error: 'Not connected to Apple Calendar' });
    }
    console.error('Error creating Apple Calendar event:', err);
    return res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * PATCH /apple/calendar/events/:eventUrl
 *
 * Update an event in the user's Apple Calendar.
 * eventUrl is base64-encoded to avoid URL-encoding issues.
 */
router.patch('/calendar/events/:eventUrl', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const eventUrl = Buffer.from(req.params.eventUrl, 'base64').toString('utf8');
    const { title, datetime, description, location, durationMinutes } = req.body;

    const event = await updateEvent(userId, eventUrl, {
      title,
      datetime,
      description,
      location,
      durationMinutes,
    });

    return res.json({
      success: true,
      event: {
        id: event.uid,
        appleEventUrl: event.calendarObjectUrl,
        title: event.summary,
        datetime: event.start,
      },
    });

  } catch (err) {
    if (err.message === 'User not connected to Apple Calendar') {
      return res.status(404).json({ error: 'Not connected to Apple Calendar' });
    }
    console.error('Error updating Apple Calendar event:', err);
    return res.status(500).json({ error: 'Failed to update event' });
  }
});

/**
 * DELETE /apple/calendar/events/:eventUrl
 *
 * Delete an event from the user's Apple Calendar.
 * eventUrl is base64-encoded.
 */
router.delete('/calendar/events/:eventUrl', async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const eventUrl = Buffer.from(req.params.eventUrl, 'base64').toString('utf8');

    await deleteEvent(userId, eventUrl);

    return res.json({ success: true, message: 'Event deleted' });

  } catch (err) {
    if (err.message === 'User not connected to Apple Calendar') {
      return res.status(404).json({ error: 'Not connected to Apple Calendar' });
    }
    console.error('Error deleting Apple Calendar event:', err);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
