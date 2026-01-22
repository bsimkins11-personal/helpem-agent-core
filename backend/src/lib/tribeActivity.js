/**
 * Tribe Activity Helper
 * 
 * Centralized helper for creating tribe activity entries.
 * This ensures all activity creation logic stays in one place.
 * 
 * IMPORTANT: This is NOT a chat system - it's a coordination feed.
 * - No replies
 * - No edits
 * - No deletes (audit trail)
 */

import { prisma } from "./prisma.js";

/**
 * Create a tribe activity entry
 * 
 * @param {Object} params
 * @param {string} params.tribeId - Tribe ID
 * @param {string} params.type - "SYSTEM" or "ADMIN"
 * @param {string} params.message - Activity message
 * @param {string|null} params.createdBy - User ID (null for system events)
 * @returns {Promise<TribeActivity>}
 */
export async function createTribeActivity({
  tribeId,
  type,
  message,
  createdBy = null,
}) {
  // Validate message length (280 chars max for admin announcements)
  if (type === "ADMIN" && message.length > 280) {
    throw new Error("Admin announcement message must be 280 characters or less");
  }

  try {
    return await prisma.tribeActivity.create({
      data: {
        tribeId,
        type,
        message: message.trim(),
        createdBy,
      },
    });
  } catch (error) {
    // If table doesn't exist yet (migration not run), log and return null
    // This allows the system to work even if activities aren't set up yet
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.warn("TribeActivity table does not exist yet - migration may not have been run");
      return null;
    }
    throw error;
  }
}

/**
 * Get user display name for activity messages
 * Helper to fetch user info when needed for activity messages
 * 
 * @param {string} userId - User ID
 * @returns {Promise<string>} Display name or "Unknown User"
 */
export async function getUserDisplayName(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { appleUserId: true }, // We'll need to add displayName later if available
    });
    
    // For now, return a truncated version of the ID
    // TODO: Add displayName to User model or fetch from auth system
    return user ? `User ${userId.slice(0, 8)}` : "Unknown User";
  } catch (error) {
    console.error("Error fetching user display name:", error);
    return "Unknown User";
  }
}
