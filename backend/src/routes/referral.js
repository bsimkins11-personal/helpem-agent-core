/**
 * Referral/Evangelist Program Routes
 *
 * REWARDS:
 * - Referee: 2 free months of basic when they enter code
 * - Inviter: Evangelist badge + 1 premium month at basic rate for every 3 signups
 *
 * RULES:
 * - One referral per referee (ignore subsequent codes)
 * - Self-referrals blocked
 * - Max 3 premium months per year for inviter (resets each calendar year)
 */

import express from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { verifySessionToken } from "../lib/sessionAuth.js";

const router = express.Router();

// Constants
const REFERRAL_CODE_LENGTH = 8;
const REFEREE_FREE_MONTHS = 2; // Months of free basic for new users
const SIGNUPS_PER_PREMIUM_MONTH = 3; // Every 3 signups = 1 premium month for inviter
const MAX_PREMIUM_MONTHS_PER_YEAR = 3; // Yearly cap on earned premium months

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
        referralBonusExpiresAt: true,
        evangelistLifetimeCount: true,
        earnedPremiumMonths: true,
        premiumMonthsThisYear: true,
        premiumMonthsYear: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Has evangelist badge if they've referred at least one person
    const hasBadge = user.evangelistLifetimeCount > 0;

    // Check if user has active free months bonus
    const now = new Date();
    const currentYear = now.getFullYear();
    const hasFreeMonths = user.referralBonusExpiresAt && user.referralBonusExpiresAt > now;

    // Progress toward next premium month
    const signupsToNextMonth = SIGNUPS_PER_PREMIUM_MONTH - (user.evangelistLifetimeCount % SIGNUPS_PER_PREMIUM_MONTH);

    // Yearly cap tracking - reset if new year
    let premiumMonthsThisYear = user.premiumMonthsThisYear || 0;
    if (user.premiumMonthsYear !== currentYear) {
      premiumMonthsThisYear = 0;
    }
    const premiumMonthsRemainingThisYear = Math.max(0, MAX_PREMIUM_MONTHS_PER_YEAR - premiumMonthsThisYear);

    return res.json({
      referralCode: user.referralCode,
      hasBadge,
      signupCount: user.evangelistLifetimeCount, // Tally of signups through their code
      earnedPremiumMonths: user.earnedPremiumMonths || 0, // Premium months earned (lifetime)
      premiumMonthsThisYear, // Earned this calendar year
      premiumMonthsRemainingThisYear, // Can still earn this year
      maxPremiumMonthsPerYear: MAX_PREMIUM_MONTHS_PER_YEAR, // The cap
      signupsToNextMonth: user.evangelistLifetimeCount > 0 ? signupsToNextMonth : SIGNUPS_PER_PREMIUM_MONTH,
      wasReferred: !!user.referredByUserId,
      referredAt: user.referredAt,
      hasFreeMonths,
      freeMonthsExpiresAt: hasFreeMonths ? user.referralBonusExpiresAt : null,
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
 * WHAT HAPPENS:
 * - Referee gets 2 free months of basic
 * - Inviter's signup tally increases by 1
 * - Inviter gets evangelist badge (if not already)
 *
 * RULES:
 * - Can only be applied ONCE per user
 * - Cannot self-refer
 * - Code must exist
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
      return res.json({
        success: true,
        message: "Referral processed",
      });
    }

    // Find the inviter by referral code
    const inviter = await prisma.user.findUnique({
      where: { referralCode: normalizedCode },
      select: {
        id: true,
        evangelistLifetimeCount: true,
        earnedPremiumMonths: true,
        premiumMonthsThisYear: true,
        premiumMonthsYear: true,
      },
    });

    if (!inviter) {
      return res.status(400).json({ error: "Invalid referral code" });
    }

    // RULE: Cannot self-refer
    if (inviter.id === userId) {
      return res.status(400).json({ error: "Cannot use your own referral code" });
    }

    // Calculate 2 months from now for referee's free bonus
    const now = new Date();
    const bonusExpiresAt = new Date(now);
    bonusExpiresAt.setMonth(bonusExpiresAt.getMonth() + REFEREE_FREE_MONTHS);

    // Apply the referral - give referee 2 free months
    await prisma.user.update({
      where: { id: userId },
      data: {
        referredByUserId: inviter.id,
        referredAt: now,
        referralBonusExpiresAt: bonusExpiresAt,
      },
    });

    // Calculate new inviter tally
    const newSignupCount = inviter.evangelistLifetimeCount + 1;
    const currentYear = now.getFullYear();

    // Check if inviter earns a premium month (every 3 signups)
    const previousMilestone = Math.floor(inviter.evangelistLifetimeCount / SIGNUPS_PER_PREMIUM_MONTH);
    const newMilestone = Math.floor(newSignupCount / SIGNUPS_PER_PREMIUM_MONTH);
    const hitMilestone = newMilestone > previousMilestone;

    // Check yearly cap - reset counter if new year
    let premiumMonthsThisYear = inviter.premiumMonthsThisYear || 0;
    if (inviter.premiumMonthsYear !== currentYear) {
      premiumMonthsThisYear = 0; // Reset for new year
    }

    // Only award if under yearly cap
    const canEarnMore = premiumMonthsThisYear < MAX_PREMIUM_MONTHS_PER_YEAR;
    const earnedNewMonth = hitMilestone && canEarnMore;

    // Update inviter's tally and premium months
    const inviterUpdate = {
      evangelistLifetimeCount: newSignupCount,
    };

    if (earnedNewMonth) {
      inviterUpdate.earnedPremiumMonths = (inviter.earnedPremiumMonths || 0) + 1;
      inviterUpdate.premiumMonthsThisYear = premiumMonthsThisYear + 1;
      inviterUpdate.premiumMonthsYear = currentYear;
    } else if (inviter.premiumMonthsYear !== currentYear) {
      // Reset yearly counter even if no award (for tracking)
      inviterUpdate.premiumMonthsThisYear = 0;
      inviterUpdate.premiumMonthsYear = currentYear;
    }

    await prisma.user.update({
      where: { id: inviter.id },
      data: inviterUpdate,
    });

    console.log(`User ${userId} applied referral code ${normalizedCode} from inviter ${inviter.id}`);
    console.log(`  - Referee gets free months until ${bonusExpiresAt.toISOString()}`);
    console.log(`  - Inviter tally now: ${newSignupCount}`);
    if (hitMilestone && !canEarnMore) {
      console.log(`  - ⚠️ Inviter hit milestone but at yearly cap (${MAX_PREMIUM_MONTHS_PER_YEAR}/year)`);
    } else if (earnedNewMonth) {
      console.log(`  - 🎉 Inviter earned a premium month! Total: ${(inviter.earnedPremiumMonths || 0) + 1}, This year: ${premiumMonthsThisYear + 1}/${MAX_PREMIUM_MONTHS_PER_YEAR}`);
    }

    return res.json({
      success: true,
      message: `Welcome! You have ${REFEREE_FREE_MONTHS} free months of HelpEm Basic.`,
      freeMonthsExpiresAt: bonusExpiresAt,
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
