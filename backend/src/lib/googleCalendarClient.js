/**
 * Google Calendar API Client
 * 
 * Handles OAuth2 flow and calendar operations.
 */

import { google } from 'googleapis';
import { encryptToken, decryptToken } from './tokenEncryption.js';
import { prisma } from './prisma.js';

// OAuth2 configuration
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Create an OAuth2 client configured with credentials.
 */
function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate the OAuth2 authorization URL.
 * 
 * @param {string} state - CSRF state parameter (should include userId)
 * @returns {string} The authorization URL
 */
export function getAuthUrl(state) {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: SCOPES,
    state: state,
    prompt: 'consent', // Force consent to get refresh token
  });
}

/**
 * Exchange authorization code for tokens.
 * 
 * @param {string} code - The authorization code from callback
 * @returns {Object} Token data including access_token, refresh_token, expiry_date
 */
export async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token) {
    throw new Error('No access token received');
  }
  
  if (!tokens.refresh_token) {
    throw new Error('No refresh token received. User may need to re-authorize with prompt=consent');
  }
  
  return tokens;
}

/**
 * Get the user's email from the access token.
 * 
 * @param {string} accessToken - Valid access token
 * @returns {string} User's Google email
 */
export async function getUserEmail(accessToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  
  return userInfo.data.email;
}

/**
 * Refresh an access token using the refresh token.
 * 
 * @param {string} refreshToken - The refresh token
 * @returns {Object} New token data
 */
export async function refreshAccessToken(refreshToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  return credentials;
}

/**
 * Revoke all tokens for a user.
 * 
 * @param {string} accessToken - The access token to revoke
 */
export async function revokeTokens(accessToken) {
  const oauth2Client = createOAuth2Client();
  await oauth2Client.revokeToken(accessToken);
}

/**
 * Get an authenticated OAuth2 client for a user.
 * Automatically refreshes token if expired.
 * 
 * @param {string} userId - The user's ID
 * @returns {Object} { oauth2Client, calendar }
 */
export async function getAuthenticatedClient(userId) {
  const connection = await prisma.googleConnection.findUnique({
    where: { userId },
  });
  
  if (!connection) {
    throw new Error('User not connected to Google Calendar');
  }
  
  const oauth2Client = createOAuth2Client();
  
  // Decrypt tokens
  const accessToken = decryptToken(connection.accessToken);
  const refreshToken = decryptToken(connection.refreshToken);
  
  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiresAt = new Date(connection.tokenExpiresAt);
  const buffer = 5 * 60 * 1000; // 5 minutes
  
  if (now.getTime() > expiresAt.getTime() - buffer) {
    console.log(`🔄 Refreshing Google token for user ${userId}`);
    
    // Refresh the token
    const newTokens = await refreshAccessToken(refreshToken);
    
    // Update stored tokens
    await prisma.googleConnection.update({
      where: { userId },
      data: {
        accessToken: encryptToken(newTokens.access_token),
        tokenExpiresAt: new Date(newTokens.expiry_date),
        updatedAt: new Date(),
      },
    });
    
    oauth2Client.setCredentials({
      access_token: newTokens.access_token,
      refresh_token: refreshToken,
    });
  } else {
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  return { oauth2Client, calendar };
}

/**
 * List calendar events for a user.
 * 
 * @param {string} userId - The user's ID
 * @param {Object} options - Query options
 * @param {Date} options.timeMin - Start of date range
 * @param {Date} options.timeMax - End of date range
 * @param {number} options.maxResults - Maximum events to return
 * @returns {Array} Array of calendar events
 */
export async function listEvents(userId, options = {}) {
  const { calendar } = await getAuthenticatedClient(userId);
  
  const timeMin = options.timeMin || new Date();
  const timeMax = options.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const maxResults = options.maxResults || 100;
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  return response.data.items || [];
}

/**
 * Create a calendar event.
 * 
 * @param {string} userId - The user's ID
 * @param {Object} eventData - Event details
 * @returns {Object} Created event
 */
export async function createEvent(userId, eventData) {
  const { calendar } = await getAuthenticatedClient(userId);
  
  const event = {
    summary: eventData.title,
    description: eventData.description || '',
    location: eventData.location || '',
    start: {
      dateTime: new Date(eventData.datetime).toISOString(),
      timeZone: eventData.timezone || 'America/New_York',
    },
    end: {
      dateTime: new Date(new Date(eventData.datetime).getTime() + (eventData.durationMinutes || 60) * 60000).toISOString(),
      timeZone: eventData.timezone || 'America/New_York',
    },
  };
  
  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });
  
  return response.data;
}

/**
 * Update a calendar event.
 * 
 * @param {string} userId - The user's ID
 * @param {string} eventId - Google Calendar event ID
 * @param {Object} eventData - Updated event details
 * @returns {Object} Updated event
 */
export async function updateEvent(userId, eventId, eventData) {
  const { calendar } = await getAuthenticatedClient(userId);
  
  // First, get the existing event
  const existing = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  });
  
  // Merge updates
  const event = {
    ...existing.data,
    summary: eventData.title || existing.data.summary,
    description: eventData.description !== undefined ? eventData.description : existing.data.description,
    location: eventData.location !== undefined ? eventData.location : existing.data.location,
  };
  
  if (eventData.datetime) {
    event.start = {
      dateTime: new Date(eventData.datetime).toISOString(),
      timeZone: eventData.timezone || 'America/New_York',
    };
    event.end = {
      dateTime: new Date(new Date(eventData.datetime).getTime() + (eventData.durationMinutes || 60) * 60000).toISOString(),
      timeZone: eventData.timezone || 'America/New_York',
    };
  }
  
  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId,
    resource: event,
  });
  
  return response.data;
}

/**
 * Delete a calendar event.
 * 
 * @param {string} userId - The user's ID
 * @param {string} eventId - Google Calendar event ID
 */
export async function deleteEvent(userId, eventId) {
  const { calendar } = await getAuthenticatedClient(userId);
  
  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });
}

export default {
  getAuthUrl,
  exchangeCodeForTokens,
  getUserEmail,
  refreshAccessToken,
  revokeTokens,
  getAuthenticatedClient,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
