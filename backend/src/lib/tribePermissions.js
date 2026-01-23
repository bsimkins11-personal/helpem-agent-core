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
  return await prisma.tribeMember.findMany({
    where: {
      userId,
      acceptedAt: { not: null },
      leftAt: null,
      tribe: {
        deletedAt: null, // Filter deleted tribes in the where clause (correct Prisma syntax)
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
 * Transition proposal state with idempotency check
 * 
 * Only recipient can transition their own proposals.
 * Idempotency keys prevent duplicate actions on retry.
 */
export async function transitionProposalState(proposalId, recipientUserId, newState, idempotencyKey = null) {
  // Check idempotency if key provided
  if (idempotencyKey) {
    const existingAction = await prisma.tribeProposalAction.findUnique({
      where: { idempotencyKey },
      include: {
        // We'll get the proposal from the action
      },
    });

    if (existingAction) {
      // Return the existing result (idempotent)
      const proposal = await prisma.tribeProposal.findUnique({
        where: { id: existingAction.proposalId },
        include: {
          item: {
            include: {
              tribe: true,
            },
          },
          recipient: true,
        },
      });

      if (proposal) {
        return { success: true, proposal, isIdempotent: true };
      }
    }
  }

  // Verify the proposal belongs to this user
  const proposal = await prisma.tribeProposal.findFirst({
    where: {
      id: proposalId,
      recipient: {
        userId: recipientUserId,
      },
    },
    include: {
      item: {
        include: {
          tribe: true,
        },
      },
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
      item: {
        include: {
          tribe: true,
        },
      },
      recipient: true,
    },
  });

  // Store idempotency key if provided
  if (idempotencyKey) {
    try {
      await prisma.tribeProposalAction.create({
        data: {
          userId: recipientUserId,
          proposalId,
          idempotencyKey,
          action: newState,
        },
      });
    } catch (error) {
      // If duplicate key (race condition), that's okay - we already processed it
      if (error.code !== 'P2002') {
        console.error("Error storing idempotency key:", error);
      }
    }
  }

  // If accepting and managementScope is "shared_and_personal", create personal item
  if (newState === "accepted" && updated.recipient.managementScope === "shared_and_personal") {
    await createPersonalItemFromProposal(updated, recipientUserId);
  }

  return { success: true, proposal: updated };
}

/**
 * Create a personal item from an accepted proposal
 * Includes origin tracking for silent deletion protection
 */
async function createPersonalItemFromProposal(proposal, userId) {
  const { item, recipient } = proposal;
  const tribe = item.tribe;
  const itemData = item.data;

  // Origin tracking - REQUIRED for silent deletion protection
  const originTracking = {
    originTribeItemId: item.id,
    originTribeProposalId: proposal.id,
    addedByTribeId: tribe.id,
    addedByTribeName: tribe.name,
  };

  try {
    switch (item.itemType) {
      case "appointment": {
        await prisma.appointment.create({
          data: {
            userId,
            title: itemData.title || "Untitled Appointment",
            withWhom: itemData.withWhom || null,
            datetime: new Date(itemData.datetime),
            durationMinutes: itemData.durationMinutes || 30,
            ...originTracking,
          },
        });
        break;
      }
      case "task": {
        await prisma.todo.create({
          data: {
            userId,
            title: itemData.title || "Untitled Task",
            priority: itemData.priority || "medium",
            dueDate: itemData.dueDate ? new Date(itemData.dueDate) : null,
            reminderTime: itemData.reminderTime ? new Date(itemData.reminderTime) : null,
            ...originTracking,
          },
        });
        break;
      }
      case "routine": {
        await prisma.habit.create({
          data: {
            userId,
            title: itemData.title || "Untitled Routine",
            frequency: itemData.frequency || "daily",
            daysOfWeek: itemData.daysOfWeek || [],
            completions: itemData.completions || [],
            ...originTracking,
          },
        });
        break;
      }
      case "grocery": {
        await prisma.groceryItem.create({
          data: {
            userId,
            name: itemData.name || "Untitled Item",
            category: itemData.category || null,
            ...originTracking,
          },
        });
        break;
      }
      default:
        console.warn(`Unknown item type: ${item.itemType}`);
    }
  } catch (error) {
    console.error("Error creating personal item from proposal:", error);
    // Don't fail the proposal acceptance if personal item creation fails
    // The item will still be in the tribe's shared items
  }
}
