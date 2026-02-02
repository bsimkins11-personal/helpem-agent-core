#!/usr/bin/env node

/**
 * Referral Reward Processing Job
 *
 * Checks for referees who have completed the eligibility criteria
 * and awards Evangelist badges to their inviters.
 *
 * ELIGIBILITY RULES:
 * - Referee must have 7+ activity days since signup
 * - Within the 14-day referral window
 * - No existing reward for this referee-inviter pair
 *
 * CAPS:
 * - Max 2 rewards per month per inviter
 * - Max 5 lifetime rewards per inviter
 *
 * Run via cron: 0 2 * * * (2 AM daily)
 * Or manually: node scripts/process-referral-rewards.js
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Initialize Prisma with PostgreSQL adapter
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// Constants - MUST match referral.js
const BADGE_DURATION_DAYS = 14;
const REFERRAL_WINDOW_DAYS = 14;
const REQUIRED_ACTIVE_DAYS = 7;
const MAX_REWARDS_PER_MONTH = 2;
const MAX_LIFETIME_REWARDS = 5;

async function main() {
  console.log("========================================");
  console.log("  REFERRAL REWARD PROCESSING");
  console.log("========================================");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("");

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  console.log(`Current month: ${currentMonth}`);
  console.log(`Required active days: ${REQUIRED_ACTIVE_DAYS}`);
  console.log(`Referral window: ${REFERRAL_WINDOW_DAYS} days`);
  console.log(`Badge duration: ${BADGE_DURATION_DAYS} days`);
  console.log("");

  // Calculate the eligibility window
  const eligibilityWindowStart = new Date();
  eligibilityWindowStart.setDate(eligibilityWindowStart.getDate() - REFERRAL_WINDOW_DAYS);

  // Get all existing referee IDs who have already been rewarded
  const rewardedRefereeIds = await prisma.referralReward.findMany({
    select: { refereeId: true },
  }).then(r => r.map(x => x.refereeId));

  console.log(`Already rewarded referees: ${rewardedRefereeIds.length}`);

  // Find potential referees:
  // 1. Has referred_by_user_id set
  // 2. referred_at is set (means they completed the referral process)
  // 3. Not already rewarded
  const potentialReferees = await prisma.user.findMany({
    where: {
      referredByUserId: { not: null },
      referredAt: { not: null },
      // Not already rewarded
      id: {
        notIn: rewardedRefereeIds,
      },
    },
    select: {
      id: true,
      referredByUserId: true,
      referredAt: true,
      createdAt: true,
      displayName: true,
    },
  });

  console.log(`Potential referees to check: ${potentialReferees.length}`);
  console.log("");

  let processedCount = 0;
  let eligibleCount = 0;
  let rewardedCount = 0;
  let cappedCount = 0;
  let windowExpiredCount = 0;

  for (const referee of potentialReferees) {
    processedCount++;

    // Check if still within referral window (14 days from signup)
    const windowEnd = new Date(referee.createdAt);
    windowEnd.setDate(windowEnd.getDate() + REFERRAL_WINDOW_DAYS);

    if (now > windowEnd) {
      // Outside referral window - no longer eligible
      windowExpiredCount++;
      continue;
    }

    // Count activity days since signup
    const activityDays = await prisma.userActivityDay.count({
      where: {
        userId: referee.id,
        date: {
          gte: referee.createdAt,
        },
      },
    });

    if (activityDays < REQUIRED_ACTIVE_DAYS) {
      // Not yet eligible - hasn't reached 7 active days
      continue;
    }

    eligibleCount++;

    // Get inviter details
    const inviter = await prisma.user.findUnique({
      where: { id: referee.referredByUserId },
      select: {
        id: true,
        displayName: true,
        evangelistLifetimeCount: true,
      },
    });

    if (!inviter) {
      console.log(`  [SKIP] Inviter not found for referee ${referee.id}`);
      continue;
    }

    // Check lifetime cap
    if (inviter.evangelistLifetimeCount >= MAX_LIFETIME_REWARDS) {
      console.log(`  [CAP] Inviter ${inviter.displayName || inviter.id} hit lifetime cap (${MAX_LIFETIME_REWARDS})`);
      cappedCount++;
      continue;
    }

    // Check monthly cap
    const monthlyRewards = await prisma.referralReward.count({
      where: {
        inviterId: inviter.id,
        awardMonth: currentMonth,
      },
    });

    if (monthlyRewards >= MAX_REWARDS_PER_MONTH) {
      console.log(`  [CAP] Inviter ${inviter.displayName || inviter.id} hit monthly cap (${MAX_REWARDS_PER_MONTH})`);
      cappedCount++;
      continue;
    }

    // Award the badge!
    const badgeExpires = new Date();
    badgeExpires.setDate(badgeExpires.getDate() + BADGE_DURATION_DAYS);

    try {
      await prisma.$transaction([
        // Create reward record
        prisma.referralReward.create({
          data: {
            inviterId: inviter.id,
            refereeId: referee.id,
            badgeExpiresAt: badgeExpires,
            awardMonth: currentMonth,
          },
        }),
        // Update inviter's badge and count
        prisma.user.update({
          where: { id: inviter.id },
          data: {
            evangelistBadgeExpiresAt: badgeExpires,
            evangelistLifetimeCount: { increment: 1 },
          },
        }),
      ]);

      rewardedCount++;
      console.log(`  [AWARDED] Badge to ${inviter.displayName || inviter.id} for referee ${referee.displayName || referee.id}`);
      console.log(`           Expires: ${badgeExpires.toISOString()}`);
      console.log(`           New lifetime count: ${inviter.evangelistLifetimeCount + 1}`);
    } catch (err) {
      console.error(`  [ERROR] Failed to award badge:`, err.message);
    }
  }

  console.log("");
  console.log("========================================");
  console.log("           SUMMARY");
  console.log("========================================");
  console.log(`Total referees checked: ${processedCount}`);
  console.log(`Eligible (7+ days): ${eligibleCount}`);
  console.log(`Rewards awarded: ${rewardedCount}`);
  console.log(`Capped (monthly/lifetime): ${cappedCount}`);
  console.log(`Window expired: ${windowExpiredCount}`);
  console.log("========================================");
}

main()
  .then(() => {
    console.log("\nReferral reward processing complete.");
    return prisma.$disconnect();
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    return prisma.$disconnect().then(() => process.exit(1));
  });
