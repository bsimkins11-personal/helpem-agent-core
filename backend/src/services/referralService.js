import { prisma } from "../lib/prisma.js";
import { extendSubscriptionRenewalDate } from "./appStoreService.js";
import { applyCustomerCredit } from "./stripeService.js";
import { createInAppNotification } from "./inAppNotificationService.js";

export const REFERRAL_QUALIFY_WINDOW_DAYS = 60;
export const REFERRAL_REQUIRED_OPEN_DAYS = 5;
export const REFERRAL_MIN_PAID_PERIOD_DAYS = 27; // Accept 27+ days to handle month length variance
export const REFERRAL_MAX_FREE_MONTHS_PER_YEAR = 3;
export const PAID_PRODUCT_IDS = new Set([
  "helpem.basic.monthly",
  "helpem.premium.monthly",
  "helpem.basic.annual",
  "helpem.premium.annual",
]);

function getAwardMonth(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isWithinWindow(date, windowEnd) {
  return date && date <= windowEnd;
}

function hasCompletedPaidPeriod(subscription, now) {
  if (!subscription || !subscription.verified) return false;
  if (!subscription.firstPaidAt || !subscription.currentPeriodEnd) return false;
  if (!subscription.productId || !PAID_PRODUCT_IDS.has(subscription.productId)) return false;

  const periodMs = subscription.currentPeriodEnd.getTime() - subscription.firstPaidAt.getTime();
  const minPeriodMs = REFERRAL_MIN_PAID_PERIOD_DAYS * 24 * 60 * 60 * 1000;

  if (periodMs < minPeriodMs) return false;
  if (subscription.currentPeriodEnd > now) return false;

  return true;
}

export async function evaluateReferralProgressForReferee(refereeId, { now = new Date() } = {}) {
  const progress = await prisma.referralProgress.findUnique({
    where: { refereeId },
  });

  if (!progress) {
    return { status: "no_progress" };
  }

  if (progress.status === "rewarded" || progress.status === "expired") {
    return { status: progress.status };
  }

  if (now > progress.eligibilityEndsAt) {
    await prisma.referralProgress.update({
      where: { id: progress.id },
      data: { status: "expired" },
    });
    return { status: "expired" };
  }

  const referee = await prisma.user.findUnique({
    where: { id: refereeId },
    select: { firstMeaningfulUseAt: true },
  });

  const openDaysCount = await prisma.userActivityDay.count({
    where: {
      userId: refereeId,
      date: {
        gte: progress.signupAt,
        lte: progress.eligibilityEndsAt,
      },
    },
  });

  const usageQualified = isWithinWindow(referee?.firstMeaningfulUseAt, progress.eligibilityEndsAt);
  const openDaysQualified = openDaysCount >= progress.openDaysRequired;

  // Check both Apple and Stripe subscriptions
  const [appleSubscription, stripeSubscription] = await Promise.all([
    prisma.userSubscriptionStatus.findUnique({
      where: { userId_platform: { userId: refereeId, platform: "apple" } },
    }),
    prisma.userSubscriptionStatus.findUnique({
      where: { userId_platform: { userId: refereeId, platform: "stripe" } },
    }),
  ]);
  const subscription = stripeSubscription || appleSubscription;

  const paidQualified = hasCompletedPaidPeriod(subscription, now);

  const updates = {
    openDaysCount,
  };

  if (usageQualified && openDaysQualified && !progress.usageQualifiedAt) {
    updates.usageQualifiedAt = now;
  }

  if (paidQualified && !progress.paidQualifiedAt) {
    updates.paidQualifiedAt = now;
  }

  let newStatus = progress.status;
  if (usageQualified && openDaysQualified) {
    newStatus = "usage_qualified";
  }
  if (usageQualified && openDaysQualified && paidQualified) {
    newStatus = "paid_qualified";
  }

  updates.status = newStatus;

  const updatedProgress = await prisma.referralProgress.update({
    where: { id: progress.id },
    data: updates,
  });

  if (!(usageQualified && openDaysQualified && paidQualified)) {
    return { status: updatedProgress.status };
  }

  const shouldNotifyEarned = updatedProgress.status === "paid_qualified" && progress.status !== "paid_qualified";

  // Reward if not already awarded
  const existingReward = await prisma.referralReward.findFirst({
    where: {
      inviterId: progress.inviterId,
      refereeId,
      rewardType: "premium_month",
    },
  });

  if (existingReward) {
    return { status: "reward_exists" };
  }

  const awardMonth = getAwardMonth(now);

  const yearPrefix = String(now.getUTCFullYear());
  const yearlyRewards = await prisma.referralReward.count({
    where: {
      inviterId: progress.inviterId,
      rewardType: "premium_month",
      awardMonth: { startsWith: yearPrefix },
      status: { not: "void" },
    },
  });

  if (yearlyRewards >= REFERRAL_MAX_FREE_MONTHS_PER_YEAR) {
    return { status: "cap_year" };
  }

  await prisma.$transaction([
    prisma.referralReward.create({
      data: {
        inviterId: progress.inviterId,
        refereeId,
        rewardType: "premium_month",
        status: "earned",
        awardMonth,
      },
    }),
    prisma.referralProgress.update({
      where: { id: progress.id },
      data: {
        status: "rewarded",
        rewardedAt: now,
      },
    }),
    prisma.user.update({
      where: { id: progress.inviterId },
      data: {
        earnedPremiumMonths: {
          increment: 1,
        },
      },
    }),
  ]);

  if (shouldNotifyEarned) {
    await createInAppNotification(progress.inviterId, {
      type: "referral_reward_earned",
      title: "Free Premium month earned",
      body: "Your invitee completed their paid month. Your free Premium month is ready.",
    });
  }

  // Attempt to apply the free month automatically
  try {
    await applyEarnedReferralRewards(progress.inviterId, now);
  } catch (err) {
    console.error("Failed to apply referral reward:", err);
  }

  return { status: "rewarded" };
}

export async function applyEarnedReferralRewards(inviterId, now = new Date()) {
  const reward = await prisma.referralReward.findFirst({
    where: {
      inviterId,
      rewardType: "premium_month",
      status: "earned",
    },
    orderBy: { awardedAt: "asc" },
  });

  if (!reward) {
    return { status: "none" };
  }

  // Try Stripe first, then Apple
  const stripeSubscription = await prisma.userSubscriptionStatus.findUnique({
    where: { userId_platform: { userId: inviterId, platform: "stripe" } },
  });

  const appleSubscription = await prisma.userSubscriptionStatus.findUnique({
    where: { userId_platform: { userId: inviterId, platform: "apple" } },
  });

  const subscription = stripeSubscription || appleSubscription;

  if (!subscription || !subscription.verified || !subscription.currentPeriodEnd) {
    return { status: "missing_subscription" };
  }

  const startsAt = subscription.currentPeriodEnd;
  const endsAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  let rewardMetadata = {};

  if (subscription.platform === "stripe") {
    // Stripe: apply credit (~$4.99 for basic monthly)
    const user = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return { status: "missing_stripe_customer" };
    }
    const credit = await applyCustomerCredit(
      user.stripeCustomerId,
      499, // $4.99 credit
      "Referral reward: 1 free month"
    );
    rewardMetadata = { stripeBalanceTransactionId: credit.id };
  } else {
    // Apple: extend subscription renewal date
    if (!subscription.originalTransactionId) {
      return { status: "missing_transaction_id" };
    }
    const result = await extendSubscriptionRenewalDate(subscription.originalTransactionId, 30);
    rewardMetadata = { requestIdentifier: result.requestIdentifier };
  }

  await prisma.referralReward.update({
    where: { id: reward.id },
    data: {
      status: "active",
      startsAt,
      endsAt,
      metadata: rewardMetadata,
    },
  });

  return { status: "applied", applied: 1 };
}

export async function getReferralCountsForInviter(inviterId, now = new Date()) {
  const [inProgressCount, activeReward, availableRewards, yearlyRewards] = await Promise.all([
    prisma.referralProgress.count({
      where: {
        inviterId,
        status: { in: ["pending", "usage_qualified", "paid_qualified"] },
      },
    }),
    prisma.referralReward.findFirst({
      where: {
        inviterId,
        rewardType: "premium_month",
        status: "active",
        endsAt: { gt: now },
      },
      orderBy: { endsAt: "desc" },
    }),
    prisma.referralReward.count({
      where: {
        inviterId,
        rewardType: "premium_month",
        status: { in: ["earned", "scheduled"] },
      },
    }),
    prisma.referralReward.count({
      where: {
        inviterId,
        rewardType: "premium_month",
        awardMonth: { startsWith: String(now.getUTCFullYear()) },
        status: { not: "void" },
      },
    }),
  ]);

  return {
    inProgressCount,
    activeReward,
    availableRewards,
    yearlyRewards,
  };
}

export function getEligibilityWindowEnd(startDate) {
  const end = new Date(startDate);
  end.setUTCDate(end.getUTCDate() + REFERRAL_QUALIFY_WINDOW_DAYS);
  return end;
}

/**
 * Grant invitee bonus when a referred user first subscribes to Basic or Premium.
 * They get +1 free month of their subscription tier.
 *
 * @param {string} refereeId - The user ID of the subscriber
 * @param {object} subscription - The subscription status object with productId, originalTransactionId
 * @returns {object} - Status of the bonus grant attempt
 */
export async function grantInviteeBonusOnFirstSubscription(refereeId, subscription) {
  // Check if user was referred
  const progress = await prisma.referralProgress.findUnique({
    where: { refereeId },
  });

  if (!progress) {
    return { status: "not_referred" };
  }

  // Check if already granted invitee bonus
  if (progress.inviteeBonusGrantedAt) {
    return { status: "already_granted" };
  }

  // Verify this is a paid subscription (Basic or Premium)
  if (!subscription?.productId || !PAID_PRODUCT_IDS.has(subscription.productId)) {
    return { status: "not_paid_subscription" };
  }

  // Need transaction ID to extend subscription
  if (!subscription.originalTransactionId) {
    return { status: "missing_transaction_id" };
  }

  try {
    let bonusResult = {};

    if (subscription.platform === "stripe") {
      // Stripe: apply credit for 1 free month
      const user = await prisma.user.findUnique({
        where: { id: refereeId },
        select: { stripeCustomerId: true },
      });
      if (user?.stripeCustomerId) {
        const credit = await applyCustomerCredit(
          user.stripeCustomerId,
          499,
          "Welcome bonus: 1 free month for referral signup"
        );
        bonusResult = { stripeBalanceTransactionId: credit.id };
      }
    } else {
      // Apple: extend subscription by 30 days
      if (!subscription.originalTransactionId) {
        return { status: "missing_transaction_id" };
      }
      const result = await extendSubscriptionRenewalDate(subscription.originalTransactionId, 30);
      bonusResult = { requestIdentifier: result.requestIdentifier };
    }

    // Mark bonus as granted
    await prisma.referralProgress.update({
      where: { id: progress.id },
      data: {
        inviteeBonusGrantedAt: new Date(),
        inviteeBonusProductId: subscription.productId,
      },
    });

    // Notify invitee
    await createInAppNotification(refereeId, {
      type: "referral_invitee_bonus",
      title: "Welcome bonus applied!",
      body: "You got +1 free month for signing up with a referral code.",
    });

    return { status: "granted", ...bonusResult };
  } catch (err) {
    console.error("Failed to grant invitee bonus:", err);
    return { status: "error", error: err.message };
  }
}
