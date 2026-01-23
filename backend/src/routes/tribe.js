/**
 * Tribe API Routes
 * 
 * NON-NEGOTIABLE PRODUCT INVARIANTS:
 * - All items added from Tribe contacts must be accepted by recipient
 * - Tribe items are proposals, not assignments
 * - No social pressure (no visibility into acceptance status)
 * - One notification per proposal creation
 * - Clear context via color (blue=personal, green=tribe)
 * - **SILENT DELETION**: Users can ALWAYS delete items from their personal lists
 *   (appointments, todos, routines, groceries) without notifying the tribe or
 *   the user who added them. This is a privacy-protecting feature.
 */

import express from "express";
import { prisma } from "../lib/prisma.js";
import { verifySessionToken } from "../lib/sessionAuth.js";
import {
  checkTribePermission,
  getUserTribes,
  getPendingProposalsCount,
  validateRecipients,
  createProposals,
  transitionProposalState,
} from "../lib/tribePermissions.js";
import { createTribeActivity, getUserDisplayName } from "../lib/tribeActivity.js";

const router = express.Router();

// =============================================================================
// TRIBE CRUD OPERATIONS
// =============================================================================

/**
 * GET /tribes
 * List all Tribes for the authenticated user
 */
router.get("/", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const tribes = await getUserTribes(userId);

    // Filter out any null tribes (in case of soft-deleted tribes)
    const validTribes = tribes.filter(membership => membership.tribe !== null);

    // Add pending proposal counts
    const tribesWithCounts = await Promise.all(
      validTribes.map(async (membership) => {
        const pendingCount = await getPendingProposalsCount(membership.id);
        return {
          id: membership.tribe.id,
          name: membership.tribe.name,
          ownerId: membership.tribe.ownerId,
          isOwner: membership.tribe.ownerId === userId,
          pendingProposals: pendingCount,
          joinedAt: membership.acceptedAt,
        };
      })
    );

    return res.json({ tribes: tribesWithCounts });
  } catch (err) {
    console.error("ERROR GET /tribes:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /tribes/invitations
 * List pending Tribe invitations for the authenticated user
 */
router.get("/invitations", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const pending = await prisma.tribeMember.findMany({
      where: {
        userId,
        acceptedAt: null,
        leftAt: null,
      },
      include: {
        tribe: true,
      },
      orderBy: {
        invitedAt: "desc",
      },
    });

    const invitations = pending.map((member) => ({
      id: member.id,
      tribeId: member.tribeId,
      tribeName: member.tribe?.name || "Tribe",
      invitedAt: member.invitedAt,
      invitedBy: member.invitedBy,
    }));

    return res.json({ invitations });
  } catch (err) {
    console.error("ERROR GET /tribes/invitations:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tribes
 * Create a new Tribe
 */
router.post("/", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Tribe name is required" });
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Create Tribe and add creator as first member
    const tribe = await prisma.tribe.create({
      data: {
        name: name.trim(),
        ownerId: userId,
        members: {
          create: {
            userId,
            invitedBy: userId,
            acceptedAt: new Date(), // Owner auto-accepts
            permissions: {
              create: {
                // Owner has all permissions (enforced in middleware too)
                canAddTasks: true,
                canRemoveTasks: true,
                canAddRoutines: true,
                canRemoveRoutines: true,
                canAddAppointments: true,
                canRemoveAppointments: true,
                canAddGroceries: true,
                canRemoveGroceries: true,
              },
            },
          },
        },
      },
      include: {
        members: true,
      },
    });

    // Format response to match GET /tribes format (what iOS client expects)
    const memberId = tribe.members[0]?.id;
    const pendingCount = memberId ? await getPendingProposalsCount(memberId) : 0;
    const formattedTribe = {
      id: tribe.id,
      name: tribe.name,
      ownerId: tribe.ownerId,
      isOwner: true, // Creator is always owner
      pendingProposals: pendingCount,
      joinedAt: tribe.members[0]?.acceptedAt || tribe.createdAt,
    };

    return res.json({ tribe: formattedTribe });
  } catch (err) {
    console.error("ERROR POST /tribes:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code,
      meta: err.meta
    });
    
    // Return more detailed error for debugging
    const errorMessage = err.message || "Internal server error";
    const errorCode = err.code || "UNKNOWN_ERROR";
    
    // Check for common database errors
    let userFriendlyMessage = "Failed to create tribe";
    if (err.code === "P2002") {
      userFriendlyMessage = "A tribe with this name already exists";
    } else if (err.code === "P2025") {
      userFriendlyMessage = "User not found";
    } else if (err.message?.includes("tribe_member_permissions") || err.message?.includes("TribeMemberPermissions")) {
      userFriendlyMessage = "Database migration may not have run. Please contact support.";
    } else if (err.message?.includes("Table") && err.message?.includes("does not exist")) {
      userFriendlyMessage = "Database tables not found. Please run migrations.";
    }
    
    return res.status(500).json({ 
      error: userFriendlyMessage,
      details: process.env.NODE_ENV === "development" ? {
        message: errorMessage,
        code: errorCode,
        meta: err.meta
      } : undefined
    });
  }
});

/**
 * PATCH /tribes/:tribeId
 * Update Tribe (rename only, owner only)
 */
router.patch("/:tribeId", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Tribe name is required" });
    }

    // Verify ownership
    const tribe = await prisma.tribe.findUnique({
      where: { id: tribeId },
    });

    if (!tribe || tribe.deletedAt) {
      return res.status(404).json({ error: "Tribe not found" });
    }

    if (tribe.ownerId !== userId) {
      return res.status(403).json({ error: "Only the owner can rename a Tribe" });
    }

    const updated = await prisma.tribe.update({
      where: { id: tribeId },
      data: { name: name.trim() },
    });

    return res.json({ tribe: updated });
  } catch (err) {
    console.error("ERROR PATCH /tribes/:tribeId:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /tribes/:tribeId
 * Soft delete Tribe (owner only)
 */
router.delete("/:tribeId", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;

    // Verify ownership
    const tribe = await prisma.tribe.findUnique({
      where: { id: tribeId },
    });

    if (!tribe || tribe.deletedAt) {
      return res.status(404).json({ error: "Tribe not found" });
    }

    if (tribe.ownerId !== userId) {
      return res.status(403).json({ error: "Only the owner can delete a Tribe" });
    }

    // Soft delete the tribe
    const deleted = await prisma.tribe.update({
      where: { id: tribeId },
      data: { deletedAt: new Date() },
    });

    // Create activity entry for deletion
    try {
      const adminName = await getUserDisplayName(userId);
      await createTribeActivity({
        tribeId,
        type: "SYSTEM",
        message: `${adminName} deleted the tribe`,
        createdBy: userId,
      });
    } catch (activityError) {
      console.error("Failed to create activity entry (non-critical):", activityError);
    }

    return res.json({ success: true, tribe: deleted });
  } catch (err) {
    console.error("ERROR DELETE /tribes/:tribeId:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      meta: err.meta
    });
    return res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

// =============================================================================
// TRIBE MEMBER OPERATIONS
// =============================================================================

/**
 * GET /tribes/:tribeId/members
 * List all members of a Tribe
 */
router.get("/:tribeId/members", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;

    // Verify membership
    const userMember = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });

    if (!userMember) {
      return res.status(403).json({ error: "Not a member of this Tribe" });
    }

    const members = await prisma.tribeMember.findMany({
      where: {
        tribeId,
        acceptedAt: { not: null },
        leftAt: null,
      },
      include: {
        permissions: true,
      },
      orderBy: {
        acceptedAt: "asc",
      },
    });

    return res.json({ members });
  } catch (err) {
    console.error("ERROR GET /tribes/:tribeId/members:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tribes/:tribeId/members
 * Add member to Tribe (OWNER ONLY - direct add)
 * OR request to add member (NON-OWNER - creates request)
 */
router.post("/:tribeId/members", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;
    const { 
      inviteeUserId,
      permissions // Optional: custom permissions for the new member
    } = req.body;

    if (!inviteeUserId) {
      return res.status(400).json({ error: "inviteeUserId is required" });
    }

    // Get tribe and verify user is a member
    const tribe = await prisma.tribe.findUnique({
      where: { id: tribeId },
    });

    if (!tribe) {
      return res.status(404).json({ error: "Tribe not found" });
    }

    const inviterMember = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });

    if (!inviterMember) {
      return res.status(403).json({ error: "Not a member of this Tribe" });
    }

    // Check if user is the owner
    const isOwner = tribe.ownerId === userId;

    // If not owner, create a request instead of directly adding
    if (!isOwner) {
      // Check if request already exists
      const existingRequest = await prisma.tribeMemberRequest.findFirst({
        where: {
          tribeId,
          requestedUserId: inviteeUserId,
          state: "pending",
        },
      });

      if (existingRequest) {
        return res.status(400).json({ 
          error: "A pending request to add this user already exists" 
        });
      }

      // Create member add request
      const request = await prisma.tribeMemberRequest.create({
        data: {
          tribeId,
          requestedBy: userId,
          requestedUserId: inviteeUserId,
          state: "pending",
        },
      });

      // Create activity entry (non-blocking - don't fail if activity creation fails)
      try {
        const requesterName = await getUserDisplayName(userId);
        const targetName = await getUserDisplayName(inviteeUserId);
        await createTribeActivity({
          tribeId,
          type: "SYSTEM",
          message: `${requesterName} requested to add ${targetName}`,
        });
      } catch (activityError) {
        console.error("Failed to create activity entry (non-critical):", activityError);
        // Continue - activity creation is optional
      }

      return res.json({ 
        request,
        message: "Request to add member sent to tribe owner" 
      });
    }

    // Owner can directly add members - continue with existing logic

    // Check if invitee already exists
    const existing = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId: inviteeUserId,
      },
    });

    if (existing) {
      if (existing.leftAt) {
        // Re-invite
        const member = await prisma.tribeMember.update({
          where: { id: existing.id },
          data: {
            invitedBy: userId,
            invitedAt: new Date(),
            leftAt: null,
            acceptedAt: null,
          },
        });
        return res.json({ member, isReinvite: true });
      } else {
        return res.status(400).json({ error: "User is already a member or has a pending invite" });
      }
    }

    // Create invitation with custom or default permissions
    const defaultPermissions = {
      canAddTasks: true,
      canRemoveTasks: false,
      canAddRoutines: true,
      canRemoveRoutines: false,
      canAddAppointments: true,
      canRemoveAppointments: false,
      canAddGroceries: true,
      canRemoveGroceries: false,
    };

    const memberPermissions = permissions || defaultPermissions;

    const member = await prisma.tribeMember.create({
      data: {
        tribeId,
        userId: inviteeUserId,
        invitedBy: userId,
        permissions: {
          create: memberPermissions,
        },
      },
      include: {
        permissions: true,
      },
    });

    // Create activity entry for direct owner add
    try {
      const adminName = await getUserDisplayName(userId);
      const targetName = await getUserDisplayName(inviteeUserId);
      await createTribeActivity({
        tribeId,
        type: "SYSTEM",
        message: `${adminName} added ${targetName} to the tribe`,
        createdBy: userId,
      });
    } catch (activityError) {
      console.error("Failed to create activity entry (non-critical):", activityError);
    }

    return res.json({ member });
  } catch (err) {
    console.error("ERROR POST /tribes/:tribeId/members:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /tribes/:tribeId/members/:memberId
 * Update member settings (permissions, management scope, notifications)
 */
router.patch("/:tribeId/members/:memberId", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId, memberId } = req.params;
    const { 
      managementScope, 
      proposalNotifications, 
      digestNotifications,
      permissions 
    } = req.body;

    // Get the member being updated
    const targetMember = await prisma.tribeMember.findFirst({
      where: {
        id: memberId,
        tribeId,
      },
      include: {
        tribe: true,
      },
    });

    if (!targetMember) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Users can update their own settings
    const isSelf = targetMember.userId === userId;
    
    // Owners can update other members' permissions
    const isOwner = targetMember.tribe.ownerId === userId;

    if (!isSelf && !isOwner) {
      return res.status(403).json({ error: "Cannot update other members' settings" });
    }

    // Build update data
    const updateData = {};
    
    if (isSelf) {
      // Users can update their own preferences
      if (managementScope !== undefined) {
        if (!["only_shared", "shared_and_personal"].includes(managementScope)) {
          return res.status(400).json({ error: "Invalid managementScope" });
        }
        updateData.managementScope = managementScope;
      }
      if (proposalNotifications !== undefined) {
        updateData.proposalNotifs = proposalNotifications;
      }
      if (digestNotifications !== undefined) {
        updateData.digestNotifs = digestNotifications;
      }
    }

    // Update member
    const updated = await prisma.tribeMember.update({
      where: { id: memberId },
      data: updateData,
      include: {
        permissions: true,
      },
    });

    // Owner can update permissions for other members (not themselves)
    if (isOwner && permissions && targetMember.userId !== userId) {
      // Use upsert to create permissions if they don't exist, or update if they do
      await prisma.tribeMemberPermissions.upsert({
        where: { memberId },
        create: {
          memberId,
          ...permissions,
        },
        update: permissions,
      });
      
      // Fetch updated member with permissions
      const finalMember = await prisma.tribeMember.findUnique({
        where: { id: memberId },
        include: {
          permissions: true,
        },
      });
      
      return res.json({ member: finalMember });
    }

    return res.json({ member: updated });
  } catch (err) {
    console.error("ERROR PATCH /tribes/:tribeId/members/:memberId:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /tribes/:tribeId/member-requests
 * Get member add requests (owners see all pending, members see their own)
 */
router.get("/:tribeId/member-requests", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;

    // Get tribe
    const tribe = await prisma.tribe.findUnique({
      where: { id: tribeId },
    });

    if (!tribe) {
      return res.status(404).json({ error: "Tribe not found" });
    }

    // Verify user is a member
    const userMember = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });

    if (!userMember) {
      return res.status(403).json({ error: "Not a member of this Tribe" });
    }

    const isOwner = tribe.ownerId === userId;

    // Owners see all pending requests, members see only their own
    const requests = await prisma.tribeMemberRequest.findMany({
      where: {
        tribeId,
        ...(isOwner ? { state: "pending" } : { requestedBy: userId }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({ requests });
  } catch (err) {
    console.error("ERROR GET /tribes/:tribeId/member-requests:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tribes/:tribeId/member-requests/:requestId/approve
 * Approve a member add request (OWNER ONLY)
 */
router.post("/:tribeId/member-requests/:requestId/approve", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId, requestId } = req.params;
    const { permissions } = req.body; // Optional: custom permissions when approving

    // Get tribe and verify user is owner
    const tribe = await prisma.tribe.findUnique({
      where: { id: tribeId },
    });

    if (!tribe) {
      return res.status(404).json({ error: "Tribe not found" });
    }

    if (tribe.ownerId !== userId) {
      return res.status(403).json({ error: "Only the tribe owner can approve member requests" });
    }

    // Get the request
    const request = await prisma.tribeMemberRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.tribeId !== tribeId) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.state !== "pending") {
      return res.status(400).json({ error: "Request is not pending" });
    }

    // Check if user is already a member
    const existing = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId: request.requestedUserId,
      },
    });

    if (existing && !existing.leftAt) {
      // User is already a member, just mark request as approved
      await prisma.tribeMemberRequest.update({
        where: { id: requestId },
        data: {
          state: "approved",
          reviewedAt: new Date(),
          reviewedBy: userId,
        },
      });
      return res.json({ message: "User is already a member", request });
    }

    // Create the member invitation with custom or default permissions
    const defaultPermissions = {
      canAddTasks: true,
      canRemoveTasks: false,
      canAddRoutines: true,
      canRemoveRoutines: false,
      canAddAppointments: true,
      canRemoveAppointments: false,
      canAddGroceries: true,
      canRemoveGroceries: false,
    };

    const memberPermissions = permissions || defaultPermissions;

    const member = await prisma.tribeMember.create({
      data: {
        tribeId,
        userId: request.requestedUserId,
        invitedBy: userId, // Owner is the inviter
        permissions: {
          create: memberPermissions,
        },
      },
      include: {
        permissions: true,
      },
    });

    // Create activity entry
    try {
      const adminName = await getUserDisplayName(userId);
      const targetName = await getUserDisplayName(request.requestedUserId);
      await createTribeActivity({
        tribeId,
        type: "SYSTEM",
        message: `${adminName} approved adding ${targetName}`,
        createdBy: userId,
      });
    } catch (activityError) {
      console.error("Failed to create activity entry (non-critical):", activityError);
    }

    // Update request as approved
    await prisma.tribeMemberRequest.update({
      where: { id: requestId },
      data: {
        state: "approved",
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
    });

    return res.json({ member, request });
  } catch (err) {
    console.error("ERROR POST /tribes/:tribeId/member-requests/:requestId/approve:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tribes/:tribeId/member-requests/:requestId/deny
 * Deny a member add request (OWNER ONLY)
 */
router.post("/:tribeId/member-requests/:requestId/deny", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId, requestId } = req.params;

    // Get tribe and verify user is owner
    const tribe = await prisma.tribe.findUnique({
      where: { id: tribeId },
    });

    if (!tribe) {
      return res.status(404).json({ error: "Tribe not found" });
    }

    if (tribe.ownerId !== userId) {
      return res.status(403).json({ error: "Only the tribe owner can deny member requests" });
    }

    // Get the request
    const request = await prisma.tribeMemberRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.tribeId !== tribeId) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.state !== "pending") {
      return res.status(400).json({ error: "Request is not pending" });
    }

    // Update request as denied
    const updatedRequest = await prisma.tribeMemberRequest.update({
      where: { id: requestId },
      data: {
        state: "denied",
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
    });

    return res.json({ request: updatedRequest });
  } catch (err) {
    console.error("ERROR POST /tribes/:tribeId/member-requests/:requestId/deny:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tribes/:tribeId/accept
 * Accept Tribe invitation
 */
router.post("/:tribeId/accept", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;

    const member = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: null,
        leftAt: null,
      },
    });

    if (!member) {
      return res.status(404).json({ error: "No pending invitation found" });
    }

    const updated = await prisma.tribeMember.update({
      where: { id: member.id },
      data: { acceptedAt: new Date() },
    });

    return res.json({ member: updated });
  } catch (err) {
    console.error("ERROR POST /tribes/:tribeId/accept:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tribes/:tribeId/leave
 * Leave a Tribe
 */
router.post("/:tribeId/leave", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;

    const member = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        leftAt: null,
      },
      include: {
        tribe: true,
      },
    });

    if (!member) {
      return res.status(404).json({ error: "Not a member of this Tribe" });
    }

    // Owner cannot leave (must delete or transfer ownership)
    if (member.tribe.ownerId === userId) {
      return res.status(400).json({ error: "Owner must delete Tribe or transfer ownership" });
    }

    await prisma.tribeMember.update({
      where: { id: member.id },
      data: { leftAt: new Date() },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("ERROR POST /tribes/:tribeId/leave:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// =============================================================================
// TRIBE INBOX & PROPOSALS
// =============================================================================

/**
 * GET /tribes/:tribeId/inbox
 * Get all proposals for current user in this Tribe
 */
router.get("/:tribeId/inbox", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;

    // Get user's membership
    const member = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Not a member of this Tribe" });
    }

    // Get proposals
    const proposals = await prisma.tribeProposal.findMany({
      where: {
        recipientId: member.id,
        state: { in: ["proposed", "not_now"] },
      },
      include: {
        item: {
          include: {
            tribe: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({ proposals });
  } catch (err) {
    console.error("ERROR GET /tribes/:tribeId/inbox:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tribes/:tribeId/proposals/:proposalId/accept
 * Accept a proposal
 * 
 * Tribe items are invitations. They never become active without explicit acceptance.
 */
router.post("/:tribeId/proposals/:proposalId/accept", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { proposalId } = req.params;
    const { idempotencyKey } = req.body; // Optional idempotency key from client

    const result = await transitionProposalState(proposalId, userId, "accepted", idempotencyKey);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ proposal: result.proposal });
  } catch (err) {
    console.error("ERROR POST /proposals/:proposalId/accept:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tribes/:tribeId/proposals/:proposalId/not-now
 * Mark proposal as "not now"
 */
router.post("/:tribeId/proposals/:proposalId/not-now", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { proposalId } = req.params;
    const { idempotencyKey } = req.body; // Optional idempotency key from client

    const result = await transitionProposalState(proposalId, userId, "not_now", idempotencyKey);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ proposal: result.proposal });
  } catch (err) {
    console.error("ERROR POST /proposals/:proposalId/not-now:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /tribes/:tribeId/proposals/:proposalId
 * Dismiss/remove a proposal
 */
router.delete("/:tribeId/proposals/:proposalId", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { proposalId } = req.params;
    // For DELETE, idempotency key can be in query params or body
    const idempotencyKey = req.body?.idempotencyKey || req.query?.idempotencyKey;

    const result = await transitionProposalState(proposalId, userId, "dismissed", idempotencyKey);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("ERROR DELETE /proposals/:proposalId:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// =============================================================================
// TRIBE ITEM CREATION (PROPOSAL FLOW)
// =============================================================================

/**
 * POST /tribes/:tribeId/items
 * Create a Tribe item and send as proposal to selected recipients
 * 
 * Tribe items are invitations. They never become active without explicit acceptance.
 */
router.post("/:tribeId/items", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;
    const { itemType, data, recipientUserIds, idempotencyKey } = req.body;

    // Validate item type
    if (!["task", "routine", "appointment", "grocery"].includes(itemType)) {
      return res.status(400).json({ error: "Invalid itemType" });
    }

    // Validate recipients
    if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
      return res.status(400).json({ 
        error: "Must select at least one recipient. No 'send to all' default." 
      });
    }

    // Check permission
    const action = "add";
    const permission = await checkTribePermission(userId, tribeId, action, itemType);
    
    if (!permission.allowed) {
      return res.status(403).json({ error: permission.reason });
    }

    // Validate that all recipients are valid members
    const isValid = await validateRecipients(tribeId, recipientUserIds);
    if (!isValid) {
      return res.status(400).json({ error: "One or more recipients are not valid Tribe members" });
    }

    // Get recipient member IDs
    const recipientMembers = await prisma.tribeMember.findMany({
      where: {
        tribeId,
        userId: { in: recipientUserIds },
        acceptedAt: { not: null },
        leftAt: null,
      },
      select: {
        id: true,
      },
    });

    // Create Tribe item
    const item = await prisma.tribeItem.create({
      data: {
        tribeId,
        createdBy: userId,
        itemType,
        data,
      },
    });

    // Create proposals for each recipient (with idempotency check)
    await createProposals(
      item.id,
      recipientMembers.map(m => m.id),
      idempotencyKey // Pass idempotency key to prevent duplicates
    );

    return res.json({ item, recipientCount: recipientMembers.length });
  } catch (err) {
    console.error("ERROR POST /tribes/:tribeId/items:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tribes/:tribeId/invite-contact
 * Invite a contact (by email or phone) to tribe
 * - If user exists, add them directly
 * - If not, create pending invitation that auto-accepts when they sign up
 */
router.post("/:tribeId/invite-contact", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.userId;
    const { tribeId } = req.params;
    const { contactIdentifier, contactType, contactName, permissions } = req.body;

    // Validate inputs
    if (!contactIdentifier || !contactType) {
      return res.status(400).json({ error: "contactIdentifier and contactType are required" });
    }

    if (!["email", "phone"].includes(contactType)) {
      return res.status(400).json({ error: "contactType must be 'email' or 'phone'" });
    }

    // Normalize the contact identifier
    const normalizedIdentifier = contactType === "email" 
      ? contactIdentifier.toLowerCase().trim()
      : contactIdentifier.replace(/[^0-9]/g, ""); // Remove non-digits for phone

    // Check if tribe exists and user is a member with permission
    const tribe = await prisma.tribe.findUnique({
      where: { id: tribeId },
    });

    if (!tribe || tribe.deletedAt) {
      return res.status(404).json({ error: "Tribe not found" });
    }

    const inviterMember = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });

    if (!inviterMember) {
      return res.status(403).json({ error: "Not a member of this Tribe" });
    }

    const isOwner = tribe.ownerId === userId;

    // TODO: In the future, we might store email/phone in User model
    // For now, we'll check if there's already a pending invitation or existing member
    
    // Check if there's already a pending invitation for this contact
    const existingInvitation = await prisma.pendingTribeInvitation.findFirst({
      where: {
        tribeId,
        contactIdentifier: normalizedIdentifier,
        state: "pending",
      },
    });

    if (existingInvitation) {
      return res.status(400).json({ 
        error: "An invitation has already been sent to this contact",
        invitation: existingInvitation 
      });
    }

    // Since we don't have email/phone in User model yet, we'll always create a pending invitation
    // This will be auto-accepted when they sign up
    
    // Calculate expiry (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invitation = await prisma.pendingTribeInvitation.create({
      data: {
        tribeId,
        invitedBy: userId,
        contactIdentifier: normalizedIdentifier,
        contactType,
        contactName: contactName || null,
        permissions: permissions || {},
        expiresAt,
        state: "pending",
      },
    });

    // Create tribe activity
    const inviterName = await getUserDisplayName(userId);
    const invitedName = contactName || normalizedIdentifier;
    
    await createTribeActivity({
      tribeId,
      userId,
      message: `${inviterName} invited ${invitedName} to the tribe`,
    });

    return res.json({ 
      success: true,
      invitation,
      message: "Invitation sent. They will be added to the tribe when they sign up." 
    });
  } catch (err) {
    console.error("ERROR POST /tribes/:tribeId/invite-contact:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /tribes/users/search
 * Search for users to add to tribe (by email or appleUserId)
 * Returns list of users that can be added
 */
router.get("/users/search", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const { email, appleUserId } = req.query;

    if (!email && !appleUserId) {
      return res.status(400).json({ error: "email or appleUserId required" });
    }

    // Search for user by email (if we have email field) or appleUserId
    const where = {};
    if (email) {
      // Note: User model currently only has appleUserId, not email
      // This is a placeholder for when email is added
      // For now, we'll search by appleUserId if provided
    }
    if (appleUserId) {
      where.appleUserId = appleUserId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        appleUserId: true,
        createdAt: true,
        lastActiveAt: true,
      },
      take: 10,
    });

    return res.json({ users });
  } catch (err) {
    console.error("ERROR GET /tribes/users/search:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /tribes/users
 * List all users (for adding to tribe - owner only feature)
 * Returns all active users in the system
 */
router.get("/users", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    // Get all active users (recently active)
    const users = await prisma.user.findMany({
      where: {
        lastActiveAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Active in last 30 days
        },
      },
      select: {
        id: true,
        appleUserId: true,
        createdAt: true,
        lastActiveAt: true,
      },
      orderBy: {
        lastActiveAt: "desc",
      },
      take: 100,
    });

    return res.json({ users });
  } catch (err) {
    console.error("ERROR GET /tribes/users:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /tribes/:tribeId/shared
 * Get all shared (accepted) items in a Tribe
 */
router.get("/:tribeId/shared", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;

    // Verify membership
    const member = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Not a member of this Tribe" });
    }

    // Get accepted items
    const acceptedProposals = await prisma.tribeProposal.findMany({
      where: {
        recipientId: member.id,
        state: "accepted",
      },
      include: {
        item: {
          where: {
            deletedAt: null,
          },
        },
      },
      orderBy: {
        stateChangedAt: "desc",
      },
    });

    return res.json({ items: acceptedProposals.map(p => p.item) });
  } catch (err) {
    console.error("ERROR GET /tribes/:tribeId/shared:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// =============================================================================
// TRIBE ACTIVITY (Ambient Signal Layer)
// =============================================================================

/**
 * GET /tribes/:tribeId/activities
 * Get activity feed for a tribe (excludes user's hidden entries)
 * 
 * Activity is a read-only bulletin board - ambient awareness without obligation.
 * It is NOT chat, NOT a task manager, and NOT a command queue.
 */
router.get("/:tribeId/activities", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;
    const { limit = 50, before } = req.query;

    // Verify membership
    const member = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Not a member of this Tribe" });
    }

    // Get user's hidden activity IDs
    const hiddenActivities = await prisma.tribeActivityHiddenBy.findMany({
      where: { userId },
      select: { activityId: true },
    });
    const hiddenIds = hiddenActivities.map(h => h.activityId);

    // Build query
    const where = {
      tribeId,
      id: hiddenIds.length > 0 ? { notIn: hiddenIds } : undefined,
    };

    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    // Get activities (excluding hidden ones)
    const activities = await prisma.tribeActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      include: {
        hiddenBy: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    return res.json({ activities });
  } catch (err) {
    console.error("ERROR GET /tribes/:tribeId/activities:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tribes/:tribeId/activities/:activityId/hide
 * Hide an activity entry for the current user
 * 
 * This is a per-user action - other users are not affected.
 * Tribe and admins are never notified.
 */
router.post("/:tribeId/activities/:activityId/hide", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId, activityId } = req.params;

    // Verify membership
    const member = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Not a member of this Tribe" });
    }

    // Verify activity belongs to tribe
    const activity = await prisma.tribeActivity.findFirst({
      where: {
        id: activityId,
        tribeId,
      },
    });

    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    // Hide activity for this user (upsert to handle duplicates)
    // Note: Prisma doesn't support composite unique constraints in upsert where clause
    // So we check first, then create or update
    const existing = await prisma.tribeActivityHiddenBy.findFirst({
      where: {
        activityId,
        userId,
      },
    });

    if (existing) {
      await prisma.tribeActivityHiddenBy.update({
        where: { id: existing.id },
        data: { hiddenAt: new Date() },
      });
    } else {
      await prisma.tribeActivityHiddenBy.create({
        data: {
          activityId,
          userId,
        },
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("ERROR POST /tribes/:tribeId/activities/:activityId/hide:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /tribes/:tribeId/activities/:activityId/hide
 * Unhide an activity entry (undo hide action)
 */
router.delete("/:tribeId/activities/:activityId/hide", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId, activityId } = req.params;

    // Verify membership
    const member = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Not a member of this Tribe" });
    }

    // Remove hide entry
    await prisma.tribeActivityHiddenBy.deleteMany({
      where: {
        activityId,
        userId,
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("ERROR DELETE /tribes/:tribeId/activities/:activityId/hide:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// =============================================================================
// TRIBE MESSAGING
// =============================================================================

/**
 * GET /tribes/:tribeId/messages
 * Get messages for a tribe (paginated)
 */
router.get("/:tribeId/messages", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before ? new Date(req.query.before) : undefined;

    // Verify user is a member
    const member = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Not a member of this Tribe" });
    }

    // Get messages (not deleted)
    const where = {
      tribeId,
      deletedAt: null,
      ...(before ? { createdAt: { lt: before } } : {}),
    };

    const messages = await prisma.tribeMessage.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        // We'll need to join with User to get display names
      },
    });

    // Reverse to show oldest first (for chat UI)
    const reversed = messages.reverse();

    return res.json({ messages: reversed });
  } catch (err) {
    console.error("ERROR GET /tribes/:tribeId/messages:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /tribes/:tribeId/messages
 * Send a message to a tribe
 */
router.post("/:tribeId/messages", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: "Message too long (max 2000 characters)" });
    }

    // Verify user is a member
    const member = await prisma.tribeMember.findFirst({
      where: {
        tribeId,
        userId,
        acceptedAt: { not: null },
        leftAt: null,
      },
    });

    if (!member) {
      return res.status(403).json({ error: "Not a member of this Tribe" });
    }

    // Create message
    const tribeMessage = await prisma.tribeMessage.create({
      data: {
        tribeId,
        userId,
        message: message.trim(),
      },
    });

    return res.json({ message: tribeMessage });
  } catch (err) {
    console.error("ERROR POST /tribes/:tribeId/messages:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /tribes/:tribeId/messages/:messageId
 * Edit a message (only by the sender)
 */
router.patch("/:tribeId/messages/:messageId", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId, messageId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get message and verify ownership
    const existingMessage = await prisma.tribeMessage.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage || existingMessage.tribeId !== tribeId) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (existingMessage.userId !== userId) {
      return res.status(403).json({ error: "Can only edit your own messages" });
    }

    if (existingMessage.deletedAt) {
      return res.status(400).json({ error: "Cannot edit deleted message" });
    }

    // Update message
    const updated = await prisma.tribeMessage.update({
      where: { id: messageId },
      data: {
        message: message.trim(),
        editedAt: new Date(),
      },
    });

    return res.json({ message: updated });
  } catch (err) {
    console.error("ERROR PATCH /tribes/:tribeId/messages/:messageId:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /tribes/:tribeId/messages/:messageId
 * Delete a message (soft delete, only by the sender)
 */
router.delete("/:tribeId/messages/:messageId", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { tribeId, messageId } = req.params;

    // Get message and verify ownership
    const existingMessage = await prisma.tribeMessage.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage || existingMessage.tribeId !== tribeId) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (existingMessage.userId !== userId) {
      return res.status(403).json({ error: "Can only delete your own messages" });
    }

    // Soft delete
    const deleted = await prisma.tribeMessage.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
      },
    });

    return res.json({ message: deleted });
  } catch (err) {
    console.error("ERROR DELETE /tribes/:tribeId/messages/:messageId:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
