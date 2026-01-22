/**
 * Tribe Permission Validation Middleware
 * 
 * Enforces non-negotiable product invariants:
 * - All Tribe items start as proposals
 * - No API may create an active item for another user
 * - Only recipient can transition to accepted
 */

import { prisma } from "./prisma.js";

/**
 * Check if user has permission to perform an action in a Tribe
 */
export async function checkTribePermission(userId, tribeId, action, itemType) {
  // Get user's tribe membership
  const member = await prisma.tribeMember.findFirst({
    where: {
      tribeId,
      userId,
      acceptedAt: { not: null },
      leftAt: null,
    },
    include: {
      permissions: true,
      tribe: true,
    },
  });

  if (!member) {
    return { allowed: false, reason: "Not a member of this Tribe" };
  }

  // Soft-deleted tribes are read-only
  if (member.tribe.deletedAt) {
    return { allowed: false, reason: "Tribe has been deleted" };
  }

  // Owner has all permissions
  if (member.tribe.ownerId === userId) {
    return { allowed: true, member };
  }

  // Check specific permission
  const permissions = member.permissions || {};
  
  // Generate permission key with correct pluralization
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  const pluralize = (type) => {
    // Special case for grocery -> groceries
    if (type === 'grocery') return 'Groceries';
    return capitalize(type) + 's';
  };
  
  const permissionKey = `can${capitalize(action)}${pluralize(itemType)}`;

  if (!permissions[permissionKey]) {
    return { 
      allowed: false, 
      reason: `You don't have permission to ${action} ${itemType}s in this Tribe` 
    };
  }

  return { allowed: true, member };
}

/**
 * Get all Tribes for a user
 */
export async function getUserTribes(userId) {
  const memberships = await prisma.tribeMember.findMany({
    where: {
      userId,
      acceptedAt: { not: null },
      leftAt: null,
      tribe: {
        deletedAt: null, // Filter deleted tribes in the where clause
      },
    },
    include: {
      tribe: true,
      proposals: {
        where: {
          state: "proposed",
        },
      },
    },
    orderBy: {
      acceptedAt: "desc",
    },
  });

  return memberships;
}

/**
 * Get pending proposals count for a Tribe
 */
export async function getPendingProposalsCount(memberId) {
  return await prisma.tribeProposal.count({
    where: {
      recipientId: memberId,
      state: "proposed",
    },
  });
}

/**
 * Validate that recipients are valid Tribe members
 */
export async function validateRecipients(tribeId, recipientUserIds) {
  const members = await prisma.tribeMember.findMany({
    where: {
      tribeId,
      userId: { in: recipientUserIds },
      acceptedAt: { not: null },
      leftAt: null,
    },
  });

  return members.length === recipientUserIds.length;
}

/**
 * Create proposals for Tribe item
 * 
 * Tribe items are invitations. They never become active without explicit acceptance.
 */
export async function createProposals(itemId, recipientMemberIds) {
  const proposals = recipientMemberIds.map(memberId => ({
    itemId,
    recipientId: memberId,
    state: "proposed",
    createdAt: new Date(),
    stateChangedAt: new Date(),
  }));

  return await prisma.tribeProposal.createMany({
    data: proposals,
  });
}

/**
 * Transition proposal state
 * 
 * Only recipient can transition their own proposals.
 */
export async function transitionProposalState(proposalId, recipientUserId, newState) {
  // Verify the proposal belongs to this user
  const proposal = await prisma.tribeProposal.findFirst({
    where: {
      id: proposalId,
      recipient: {
        userId: recipientUserId,
      },
    },
    include: {
      item: true,
      recipient: true,
    },
  });

  if (!proposal) {
    return { success: false, error: "Proposal not found" };
  }

  // Valid state transitions
  const validTransitions = {
    proposed: ["accepted", "not_now", "dismissed"],
    not_now: ["accepted", "dismissed"],
  };

  if (!validTransitions[proposal.state]?.includes(newState)) {
    return { 
      success: false, 
      error: `Cannot transition from ${proposal.state} to ${newState}` 
    };
  }

  // Update proposal state
  const updated = await prisma.tribeProposal.update({
    where: { id: proposalId },
    data: {
      state: newState,
      stateChangedAt: new Date(),
    },
    include: {
      item: true,
    },
  });

  return { success: true, proposal: updated };
}
