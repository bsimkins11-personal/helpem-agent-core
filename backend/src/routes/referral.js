/**
 * Referral/Evangelist Program Routes
 *
 * CRITICAL RULES:
 * - One referral per referee (ignore subsequent codes)
 * - Max 2 rewards per month per inviter
 * - Max 5 lifetime rewards per inviter
 * - Self-referrals blocked
 * - Badge duration: 14 days
 * - Eligibility: 7 active days within 14 days of signup
 */

import express from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { verifySessionToken } from "../lib/sessionAuth.js";

const router = express.Router();

// Constants - SINGLE SOURCE OF TRUTH
const BADGE_DURATION_DAYS = 14;
const REFERRAL_WINDOW_DAYS = 14;
const REQUIRED_ACTIVE_DAYS = 7;
const MAX_REWARDS_PER_MONTH = 2;
const MAX_LIFETIME_REWARDS = 5;
const REFERRAL_CODE_LENGTH = 8;

/**
 * Generate a unique 8-character referral code
 * Uses alphanumeric chars, uppercase for readability
 */
function generateReferralCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0, O, 1, I)
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * GET /referral
 * Get current user's referral info and badge status
 */
router.get("/", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referredByUserId: true,
        referredAt: true,
        evangelistBadgeExpiresAt: true,
        evangelistLifetimeCount: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if badge is currently active
    const now = new Date();
    const hasBadge = user.evangelistBadgeExpiresAt && user.evangelistBadgeExpiresAt > now;

    // Get this month's reward count
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthlyRewardCount = await prisma.referralReward.count({
      where: {
        inviterId: userId,
        awardMonth: currentMonth,
      },
    });

    // Get total referees who are still in progress (signed up but not yet qualified)
    const pendingReferees = await prisma.user.count({
      where: {
        referredByUserId: userId,
        // Not yet rewarded
        id: {
          notIn: await prisma.referralReward.findMany({
            where: { inviterId: userId },
            select: { refereeId: true },
          }).then(r => r.map(x => x.refereeId)),
        },
      },
    });

    return res.json({
      referralCode: user.referralCode,
      hasBadge,
      badgeExpiresAt: hasBadge ? user.evangelistBadgeExpiresAt : null,
      lifetimeCount: user.evangelistLifetimeCount,
      monthlyRewardCount,
      monthlyRewardLimit: MAX_REWARDS_PER_MONTH,
      lifetimeLimit: MAX_LIFETIME_REWARDS,
      pendingReferees,
      wasReferred: !!user.referredByUserId,
      referredAt: user.referredAt,
    });
  } catch (err) {
    console.error("ERROR GET /referral:", err);
    return res.status(500).json({ error: "Failed to get referral info" });
  }
});

/**
 * POST /referral/generate-code
 * Generate a referral code for user (if they don't have one)
 */
router.post("/generate-code", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    // Check if user already has a code
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.referralCode) {
      // Return existing code
      return res.json({
        referralCode: user.referralCode,
        isNew: false,
      });
    }

    // Generate a unique code with retry logic
    let code;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      code = generateReferralCode();

      // Check if code already exists
      const existing = await prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      });

      if (!existing) {
        break; // Found a unique code
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error(`Failed to generate unique referral code after ${maxAttempts} attempts`);
      return res.status(500).json({ error: "Failed to generate referral code. Please try again." });
    }

    // Save the code
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    console.log(`Generated referral code ${code} for user ${userId}`);

    return res.json({
      referralCode: code,
      isNew: true,
    });
  } catch (err) {
    console.error("ERROR POST /referral/generate-code:", err);
    return res.status(500).json({ error: "Failed to generate referral code" });
  }
});

/**
 * POST /referral/apply
 * Apply a referral code during signup
 *
 * CRITICAL RULES:
 * - Can only be applied ONCE per user
 * - Cannot self-refer
 * - Code must exist
 * - Silent failure if already referred (don't reveal to user)
 */
router.post("/apply", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Referral code required" });
    }

    // Normalize code (uppercase, trim)
    const normalizedCode = code.trim().toUpperCase();

    if (normalizedCode.length !== REFERRAL_CODE_LENGTH) {
      return res.status(400).json({ error: "Invalid referral code format" });
    }

    // Get current user to check if already referred
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referredByUserId: true,
        createdAt: true,
      },
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // RULE: One referral per user - silently ignore if already referred
    if (currentUser.referredByUserId) {
      console.log(`User ${userId} already has a referrer, ignoring new code ${normalizedCode}`);
      // Return success to avoid revealing that they're already referred
      return res.json({
        success: true,
        message: "Referral processed",
      });
    }

    // Find the inviter by referral code
    const inviter = await prisma.user.findUnique({
      where: { referralCode: normalizedCode },
      select: { id: true },
    });

    if (!inviter) {
      return res.status(400).json({ error: "Invalid referral code" });
    }

    // RULE: Cannot self-refer
    if (inviter.id === userId) {
      return res.status(400).json({ error: "Cannot use your own referral code" });
    }

    // Apply the referral
    await prisma.user.update({
      where: { id: userId },
      data: {
        referredByUserId: inviter.id,
        referredAt: new Date(),
      },
    });

    console.log(`User ${userId} applied referral code ${normalizedCode} from inviter ${inviter.id}`);

    return res.json({
      success: true,
      message: "Referral applied! Use HelpEm for 7 days to earn your referrer a badge.",
    });
  } catch (err) {
    console.error("ERROR POST /referral/apply:", err);
    return res.status(500).json({ error: "Failed to apply referral code" });
  }
});

/**
 * GET /referral/stats
 * Get detailed referral statistics for current user
 * (For debugging/admin purposes)
 */
router.get("/stats", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    // Get all referees (people who used this user's code)
    const referees = await prisma.user.findMany({
      where: { referredByUserId: userId },
      select: {
        id: true,
        displayName: true,
        createdAt: true,
        referredAt: true,
      },
    });

    // Get activity days for each referee
    const refereesWithActivity = await Promise.all(
      referees.map(async (referee) => {
        const activityDays = await prisma.userActivityDay.count({
          where: {
            userId: referee.id,
            date: {
              gte: referee.createdAt,
            },
          },
        });

        // Check if already rewarded
        const reward = await prisma.referralReward.findFirst({
          where: {
            inviterId: userId,
            refereeId: referee.id,
          },
        });

        return {
          id: referee.id,
          displayName: referee.displayName || "Anonymous",
          signupDate: referee.createdAt,
          activityDays,
          requiredDays: REQUIRED_ACTIVE_DAYS,
          isEligible: activityDays >= REQUIRED_ACTIVE_DAYS,
          wasRewarded: !!reward,
          rewardedAt: reward?.awardedAt,
        };
      })
    );

    // Get all rewards
    const rewards = await prisma.referralReward.findMany({
      where: { inviterId: userId },
      orderBy: { awardedAt: "desc" },
    });

    return res.json({
      totalReferees: referees.length,
      eligibleReferees: refereesWithActivity.filter(r => r.isEligible && !r.wasRewarded).length,
      rewardedReferees: refereesWithActivity.filter(r => r.wasRewarded).length,
      referees: refereesWithActivity,
      rewards: rewards.map(r => ({
        awardedAt: r.awardedAt,
        badgeExpiresAt: r.badgeExpiresAt,
        awardMonth: r.awardMonth,
      })),
    });
  } catch (err) {
    console.error("ERROR GET /referral/stats:", err);
    return res.status(500).json({ error: "Failed to get referral stats" });
  }
});

export default router;
