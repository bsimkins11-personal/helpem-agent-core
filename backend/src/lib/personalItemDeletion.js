/**
 * Personal Item Deletion Helper
 * 
 * CRITICAL PRIVACY RULE:
 * Users can ALWAYS delete items from their personal lists (appointments, todos, 
 * routines, groceries) regardless of who added them or what permissions exist.
 * 
 * Deletions are SILENT - no notifications are sent to:
 * - The tribe that added the item
 * - The user who added the item
 * - Any other tribe members
 * 
 * This ensures users maintain full control over their personal space without
 * creating social friction or pressure.
 */

import { prisma } from "./prisma.js";

/**
 * Check if a user can delete a personal item
 * ALWAYS returns true - users always have deletion rights for their own items
 * 
 * @param {string} userId - The user ID
 * @param {string} itemId - The item ID
 * @param {string} itemType - 'appointment', 'todo', 'habit', or 'grocery'
 * @returns {Promise<boolean>} Always returns true
 */
export async function canUserDeletePersonalItem(userId, itemId, itemType) {
  // Verify the item belongs to the user
  let item;
  
  switch (itemType) {
    case 'appointment':
      item = await prisma.appointment.findUnique({
        where: { id: itemId },
        select: { userId: true },
      });
      break;
    case 'todo':
      item = await prisma.todo.findUnique({
        where: { id: itemId },
        select: { userId: true },
      });
      break;
    case 'habit':
      item = await prisma.habit.findUnique({
        where: { id: itemId },
        select: { userId: true },
      });
      break;
    case 'grocery':
      item = await prisma.groceryItem.findUnique({
        where: { id: itemId },
        select: { userId: true },
      });
      break;
    default:
      return false;
  }
  
  // User can only delete their own items
  if (!item || item.userId !== userId) {
    return false;
  }
  
  // Users ALWAYS have the right to delete their own items
  return true;
}

/**
 * Delete a personal item silently (no notifications)
 * 
 * @param {string} userId - The user ID
 * @param {string} itemId - The item ID
 * @param {string} itemType - 'appointment', 'todo', 'habit', or 'grocery'
 * @returns {Promise<object>} The deleted item
 */
export async function deletePersonalItemSilently(userId, itemId, itemType) {
  // Verify user owns the item
  const canDelete = await canUserDeletePersonalItem(userId, itemId, itemType);
  if (!canDelete) {
    throw new Error("Cannot delete item: not owned by user");
  }
  
  // Delete the item (no notifications sent)
  let deleted;
  
  switch (itemType) {
    case 'appointment':
      deleted = await prisma.appointment.delete({
        where: { id: itemId },
      });
      break;
    case 'todo':
      deleted = await prisma.todo.delete({
        where: { id: itemId },
      });
      break;
    case 'habit':
      deleted = await prisma.habit.delete({
        where: { id: itemId },
      });
      break;
    case 'grocery':
      deleted = await prisma.groceryItem.delete({
        where: { id: itemId },
      });
      break;
    default:
      throw new Error(`Unknown item type: ${itemType}`);
  }
  
  // IMPORTANT: No notifications are sent here
  // The deletion is completely silent - no tribe activity, no messages, nothing
  
  return deleted;
}

/**
 * Get tribe information for an item (if it was added by a tribe)
 * 
 * @param {string} itemId - The item ID
 * @param {string} itemType - 'appointment', 'todo', 'habit', or 'grocery'
 * @returns {Promise<object|null>} Tribe info or null if not added by tribe
 */
export async function getItemTribeInfo(itemId, itemType) {
  let item;
  
  switch (itemType) {
    case 'appointment':
      item = await prisma.appointment.findUnique({
        where: { id: itemId },
        select: {
          addedByTribeId: true,
          addedByTribeName: true,
        },
      });
      break;
    case 'todo':
      item = await prisma.todo.findUnique({
        where: { id: itemId },
        select: {
          addedByTribeId: true,
          addedByTribeName: true,
        },
      });
      break;
    case 'habit':
      item = await prisma.habit.findUnique({
        where: { id: itemId },
        select: {
          addedByTribeId: true,
          addedByTribeName: true,
        },
      });
      break;
    case 'grocery':
      item = await prisma.groceryItem.findUnique({
        where: { id: itemId },
        select: {
          addedByTribeId: true,
          addedByTribeName: true,
        },
      });
      break;
    default:
      return null;
  }
  
  if (!item || !item.addedByTribeId) {
    return null;
  }
  
  return {
    tribeId: item.addedByTribeId,
    tribeName: item.addedByTribeName,
  };
}
