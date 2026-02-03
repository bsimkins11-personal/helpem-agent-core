/**
 * Referral/Evangelist Program Routes
 *
 * REWARDS:
 * - Inviter: Evangelist badge for each referral signup
 * - Inviter: 1 free Premium month when invitee completes:
 *   - 5 distinct app opens in first 30 days
 *   - 1 meaningful in-app action
 *   - 1 completed paid subscription period (Apple verified)
 *
 * RULES:
 * - One referral per referee (ignore subsequent codes)
 * - Self-referrals blocked
 * - Max 3 free premium months per calendar year
 */

import express from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { verifySessionToken } from "../lib/sessionAuth.js";
import {
  evaluateReferralProgressForReferee,
  getEligibilityWindowEnd,
  getReferralCountsForInviter,
  REFERRAL_MAX_FREE_MONTHS_PER_YEAR,
} from "../services/referralService.js";
import { createInAppNotification } from "../services/inAppNotificationService.js";
import { isSMSEnabled, sendReferralInviteSMS } from "../services/smsService.js";

const router = express.Router();

// Constants
const REFERRAL_CODE_LENGTH = 6;
const MAX_FREE_MONTHS_PER_YEAR = REFERRAL_MAX_FREE_MONTHS_PER_YEAR;

/**
 * Generate a unique 8-character referral code
 * Uses alphanumeric chars, uppercase for readability
 */
function generateReferralCode() {
  const chars = "0123456789";
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

    const now = new Date();
    const counts = await getReferralCountsForInviter(userId, now);

    // For backward compatibility with existing clients
    const premiumMonthsThisYear = counts.yearlyRewards;
    const premiumMonthsRemainingThisYear = Math.max(0, MAX_FREE_MONTHS_PER_YEAR - counts.yearlyRewards);

    return res.json({
      referralCode: user.referralCode,
      hasBadge,
      signupCount: user.evangelistLifetimeCount, // Tally of signups through their code
      earnedPremiumMonths: user.earnedPremiumMonths || 0, // Premium months earned (lifetime)
      premiumMonthsThisYear, // Earned this calendar year
      premiumMonthsRemainingThisYear, // Can still earn this year
      maxPremiumMonthsPerYear: MAX_FREE_MONTHS_PER_YEAR, // Back-compat field (yearly cap)
      signupsToNextMonth: 1, // Back-compat field (now per-qualified referral)
      wasReferred: !!user.referredByUserId,
      referredAt: user.referredAt,
      hasFreeMonths: false,
      freeMonthsExpiresAt: null,
      freeMonthsInProgress: counts.inProgressCount,
      freeMonthsAvailable: counts.availableRewards,
      freeMonthActiveUntil: counts.activeReward?.endsAt || null,
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
 * POST /referral/invite-sms
 * Send referral code via SMS to a phone number
 */
router.post("/invite-sms", async (req, res) => {
  try {
    if (!isSMSEnabled()) {
      return res.status(400).json({ error: "SMS is not configured" });
    }

    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { phone } = req.body || {};

    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        displayName: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let code = user.referralCode;
    if (!code) {
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        code = generateReferralCode();
        const existing = await prisma.user.findUnique({
          where: { referralCode: code },
          select: { id: true },
        });
        if (!existing) break;
        attempts++;
      }

      if (!code || attempts >= maxAttempts) {
        return res.status(500).json({ error: "Failed to generate referral code" });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
    }

    const inviterName = user.displayName || "Your friend";
    await sendReferralInviteSMS(phone, inviterName, code);

    return res.json({ success: true });
  } catch (err) {
    console.error("ERROR POST /referral/invite-sms:", err);
    return res.status(500).json({ error: "Failed to send referral SMS" });
  }
});

/**
 * POST /referral/apply
 * Apply a referral code during signup
 *
 * WHAT HAPPENS:
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

    const isSixDigit = /^[0-9]{6}$/.test(normalizedCode);
    const isLegacyEightChar = /^[A-Z2-9]{8}$/.test(normalizedCode);

    if (!isSixDigit && !isLegacyEightChar) {
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

    const now = new Date();

    // Apply the referral
    await prisma.user.update({
      where: { id: userId },
      data: {
        referredByUserId: inviter.id,
        referredAt: now,
      },
    });

    // Calculate new inviter tally
    const newSignupCount = inviter.evangelistLifetimeCount + 1;

    const inviterUpdate = {
      evangelistLifetimeCount: newSignupCount,
    };

    await prisma.user.update({
      where: { id: inviter.id },
      data: inviterUpdate,
    });

    // Create referral progress tracker
    const eligibilityEndsAt = getEligibilityWindowEnd(now);
    await prisma.referralProgress.create({
      data: {
        inviterId: inviter.id,
        refereeId: userId,
        signupAt: now,
        eligibilityEndsAt,
        status: "pending",
      },
    });

    await createInAppNotification(inviter.id, {
      type: "referral_started",
      title: "Referral started",
      body: "Your friend joined. Tracking is on for a free Premium month.",
    });

    console.log(`User ${userId} applied referral code ${normalizedCode} from inviter ${inviter.id}`);
    console.log(`  - Inviter tally now: ${newSignupCount}`);

    return res.json({
      success: true,
      message: "Referral applied!",
    });
  } catch (err) {
    console.error("ERROR POST /referral/apply:", err);
    return res.status(500).json({ error: "Failed to apply referral code" });
  }
});

/**
 * POST /referral/mark-usage
 * Mark a meaningful in-app action for the current user (used for referral qualification)
 */
router.post("/mark-usage", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstMeaningfulUseAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.firstMeaningfulUseAt) {
      await prisma.user.update({
        where: { id: userId },
        data: { firstMeaningfulUseAt: new Date() },
      });
    }

    const evaluation = await evaluateReferralProgressForReferee(userId);

    return res.json({ success: true, status: evaluation.status });
  } catch (err) {
    console.error("ERROR POST /referral/mark-usage:", err);
    return res.status(500).json({ error: "Failed to record usage" });
  }
});

/**
 * POST /referral/evaluate
 * Evaluate referral progress for current user (rolling trigger check)
 */
router.post("/evaluate", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const evaluation = await evaluateReferralProgressForReferee(userId);

    return res.json({ success: true, status: evaluation.status });
  } catch (err) {
    console.error("ERROR POST /referral/evaluate:", err);
    return res.status(500).json({ error: "Failed to evaluate referral status" });
  }
});

/**
 * POST /referral/ping-open
 * Track a distinct open day for referral qualification.
 */
router.post("/ping-open", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await prisma.userActivityDay.upsert({
      where: {
        userId_date: { userId, date: today },
      },
      update: {},
      create: {
        userId,
        date: today,
      },
    });

    const evaluation = await evaluateReferralProgressForReferee(userId);

    return res.json({ success: true, status: evaluation.status });
  } catch (err) {
    console.error("ERROR POST /referral/ping-open:", err);
    return res.status(500).json({ error: "Failed to record open" });
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

    // Get referral progress for each referee
    const refereesWithProgress = await Promise.all(
      referees.map(async (referee) => {
        const progress = await prisma.referralProgress.findUnique({
          where: { refereeId: referee.id },
        });

        const reward = await prisma.referralReward.findFirst({
          where: {
            inviterId: userId,
            refereeId: referee.id,
            rewardType: "premium_month",
          },
        });

        return {
          id: referee.id,
          displayName: referee.displayName || "Anonymous",
          signupDate: referee.createdAt,
          status: progress?.status || "unknown",
          openDaysCount: progress?.openDaysCount || 0,
          openDaysRequired: progress?.openDaysRequired || 0,
          usageQualifiedAt: progress?.usageQualifiedAt || null,
          paidQualifiedAt: progress?.paidQualifiedAt || null,
          eligibilityEndsAt: progress?.eligibilityEndsAt || null,
          wasRewarded: !!reward,
          rewardedAt: reward?.awardedAt,
        };
      })
    );

    const rewards = await prisma.referralReward.findMany({
      where: { inviterId: userId },
      orderBy: { awardedAt: "desc" },
    });

    return res.json({
      totalReferees: referees.length,
      eligibleReferees: refereesWithProgress.filter(r => r.status === "paid_qualified" && !r.wasRewarded).length,
      rewardedReferees: refereesWithProgress.filter(r => r.wasRewarded).length,
      referees: refereesWithProgress,
      rewards: rewards.map(r => ({
        awardedAt: r.awardedAt,
        rewardType: r.rewardType,
        status: r.status,
        awardMonth: r.awardMonth,
      })),
    });
  } catch (err) {
    console.error("ERROR GET /referral/stats:", err);
    return res.status(500).json({ error: "Failed to get referral stats" });
  }
});

export default router;
