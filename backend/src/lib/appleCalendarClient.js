/**
 * Apple Calendar CalDAV Client
 *
 * Handles iCloud CalDAV connection and calendar CRUD operations.
 * Uses the tsdav library for CalDAV protocol support.
 */

import { createDAVClient } from 'tsdav';
import crypto from 'crypto';
import { decryptToken } from './tokenEncryption.js';
import { prisma } from './prisma.js';

const ICLOUD_CALDAV_URL = 'https://caldav.icloud.com';

/**
 * Test iCloud CalDAV credentials by connecting and fetching calendars.
 *
 * @param {string} appleEmail - Apple ID email
 * @param {string} appPassword - App-specific password
 * @returns {{ success: boolean, calendars: Array, principalUrl: string }}
 */
export async function testConnection(appleEmail, appPassword) {
  const client = await createDAVClient({
    serverUrl: ICLOUD_CALDAV_URL,
    credentials: {
      username: appleEmail,
      password: appPassword,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  const calendars = await client.fetchCalendars();

  return {
    success: true,
    calendars: calendars.map(c => ({
      displayName: c.displayName,
      url: c.url,
    })),
    principalUrl: client.account?.principalUrl || null,
  };
}

/**
 * Get an authenticated CalDAV client for a user.
 *
 * @param {string} userId - The user's ID
 * @returns {{ client: DAVClient, calendars: Array }}
 */
export async function getAuthenticatedClient(userId) {
  const connection = await prisma.appleCalendarConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    throw new Error('User not connected to Apple Calendar');
  }

  const appPassword = decryptToken(connection.appPassword);

  const client = await createDAVClient({
    serverUrl: connection.caldavUrl || ICLOUD_CALDAV_URL,
    credentials: {
      username: connection.appleEmail,
      password: appPassword,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  const calendars = await client.fetchCalendars();

  return { client, calendars };
}

/**
 * Get the primary (default) calendar for a user.
 */
async function getPrimaryCalendar(userId) {
  const { client, calendars } = await getAuthenticatedClient(userId);

  // Prefer the default calendar, fall back to first available
  const primary = calendars.find(c =>
    c.displayName?.toLowerCase() === 'calendar' ||
    c.displayName?.toLowerCase() === 'home'
  ) || calendars[0];

  if (!primary) {
    throw new Error('No calendars found in Apple Calendar');
  }

  return { client, calendar: primary };
}

/**
 * Parse a VEVENT from iCalendar data.
 */
function parseVEvent(icsData, url) {
  const lines = icsData.split(/\r?\n/);
  const event = { calendarObjectUrl: url };
  let inEvent = false;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; continue; }
    if (line === 'END:VEVENT') { inEvent = false; continue; }
    if (!inEvent) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const keyPart = line.substring(0, colonIdx);
    const value = line.substring(colonIdx + 1);
    const key = keyPart.split(';')[0]; // Strip parameters like TZID

    switch (key) {
      case 'UID': event.uid = value; break;
      case 'SUMMARY': event.summary = value; break;
      case 'DESCRIPTION': event.description = value?.replace(/\\n/g, '\n'); break;
      case 'LOCATION': event.location = value; break;
      case 'DTSTART': event.start = parseICalDate(value); event.isAllDay = value.length === 8; break;
      case 'DTEND': event.end = parseICalDate(value); break;
    }
  }

  return event;
}

/**
 * Parse an iCalendar date string to ISO format.
 */
function parseICalDate(dateStr) {
  if (!dateStr) return null;

  // All-day: 20260207
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }

  // DateTime: 20260207T153000Z or 20260207T153000
  const clean = dateStr.replace(/Z$/, '');
  if (clean.length >= 15) {
    const iso = `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T${clean.slice(9, 11)}:${clean.slice(11, 13)}:${clean.slice(13, 15)}`;
    return dateStr.endsWith('Z') ? iso + 'Z' : iso;
  }

  return dateStr;
}

/**
 * Build an iCalendar VEVENT string.
 */
function buildVEvent(eventData) {
  const uid = crypto.randomUUID();
  const now = formatICalDate(new Date());
  const start = formatICalDate(new Date(eventData.datetime));
  const endDate = new Date(new Date(eventData.datetime).getTime() + (eventData.durationMinutes || 60) * 60000);
  const end = formatICalDate(endDate);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HelpEm//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICalText(eventData.title)}`,
  ];

  if (eventData.description) {
    lines.push(`DESCRIPTION:${escapeICalText(eventData.description)}`);
  }
  if (eventData.location) {
    lines.push(`LOCATION:${escapeICalText(eventData.location)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return { icsString: lines.join('\r\n'), uid };
}

/**
 * Format a Date to iCalendar date-time format (UTC).
 */
function formatICalDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape text for iCalendar format.
 */
function escapeICalText(text) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * List calendar events for a user.
 *
 * @param {string} userId
 * @param {{ timeMin?: Date, timeMax?: Date }} options
 * @returns {Array}
 */
export async function listEvents(userId, options = {}) {
  const { client, calendar } = await getPrimaryCalendar(userId);

  const timeMin = options.timeMin || new Date();
  const timeMax = options.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const calendarObjects = await client.fetchCalendarObjects({
    calendar,
    timeRange: {
      start: formatICalDate(timeMin),
      end: formatICalDate(timeMax),
    },
  });

  const events = calendarObjects
    .filter(obj => obj.data)
    .map(obj => parseVEvent(obj.data, obj.url))
    .filter(e => e.uid && e.start);

  // Update last synced
  await prisma.appleCalendarConnection.update({
    where: { userId },
    data: { lastSyncedAt: new Date() },
  });

  return events;
}

/**
 * Create a calendar event.
 *
 * @param {string} userId
 * @param {Object} eventData - { title, datetime, description?, location?, durationMinutes? }
 * @returns {Object} Created event info
 */
export async function createEvent(userId, eventData) {
  const { client, calendar } = await getPrimaryCalendar(userId);

  const { icsString, uid } = buildVEvent(eventData);
  const filename = `${uid}.ics`;

  await client.createCalendarObject({
    calendar,
    filename,
    iCalString: icsString,
  });

  return {
    uid,
    summary: eventData.title,
    start: new Date(eventData.datetime).toISOString(),
    calendarObjectUrl: `${calendar.url}${filename}`,
  };
}

/**
 * Update a calendar event.
 *
 * @param {string} userId
 * @param {string} eventUrl - The CalDAV object URL
 * @param {Object} eventData - Updated fields
 * @returns {Object}
 */
export async function updateEvent(userId, eventUrl, eventData) {
  const { client, calendar } = await getPrimaryCalendar(userId);

  // Fetch existing event
  const existing = await client.fetchCalendarObjects({
    calendar,
    objectUrls: [eventUrl],
  });

  if (!existing || existing.length === 0) {
    throw new Error('Calendar event not found');
  }

  const existingEvent = parseVEvent(existing[0].data, eventUrl);

  // Build updated event
  const updatedData = {
    title: eventData.title || existingEvent.summary || 'Untitled',
    datetime: eventData.datetime || existingEvent.start,
    description: eventData.description !== undefined ? eventData.description : existingEvent.description,
    location: eventData.location !== undefined ? eventData.location : existingEvent.location,
    durationMinutes: eventData.durationMinutes || 60,
  };

  const { icsString } = buildVEvent(updatedData);

  // Replace UID with existing UID to maintain identity
  const finalIcs = icsString.replace(
    /UID:[^\r\n]+/,
    `UID:${existingEvent.uid}`
  );

  await client.updateCalendarObject({
    calendarObject: {
      url: eventUrl,
      data: finalIcs,
      etag: existing[0].etag,
    },
  });

  return {
    uid: existingEvent.uid,
    summary: updatedData.title,
    start: new Date(updatedData.datetime).toISOString(),
    calendarObjectUrl: eventUrl,
  };
}

/**
 * Delete a calendar event.
 *
 * @param {string} userId
 * @param {string} eventUrl - The CalDAV object URL
 */
export async function deleteEvent(userId, eventUrl) {
  const { client } = await getAuthenticatedClient(userId);

  await client.deleteCalendarObject({
    calendarObject: {
      url: eventUrl,
    },
  });
}

export default {
  testConnection,
  getAuthenticatedClient,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
