/**
 * Subscription status routes (Apple IAP)
 *
 * NOTE: Verified status should only be set from trusted server-to-server notifications.
 */

import express from "express";
import { prisma } from "../lib/prisma.js";
import { verifySessionToken } from "../lib/sessionAuth.js";
import {
  evaluateReferralProgressForReferee,
  grantInviteeBonusOnFirstSubscription,
} from "../services/referralService.js";
import {
  verifyOrDecodeSignedPayload,
  verifyNestedSignedPayload,
} from "../lib/appStoreNotifications.js";

const router = express.Router();

const isTrustedRequest = (req) => {
  const secret = process.env.SUBSCRIPTION_WEBHOOK_SECRET;
  if (!secret) return false;
  const provided = req.headers["x-subscription-secret"];
  return typeof provided === "string" && provided === secret;
};

function parseAppleDate(ms) {
  if (!ms) return null;
  const value = Number(ms);
  if (!Number.isFinite(value)) return null;
  return new Date(value);
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-fA-F-]{36}$/.test(value);
}

function determineStatus(transactionInfo) {
  const now = Date.now();
  const expiresDate = Number(transactionInfo?.expiresDate || 0);
  const revocationDate = Number(transactionInfo?.revocationDate || 0);

  if (revocationDate) return "revoked";
  if (expiresDate && expiresDate > now) return "active";
  return "expired";
}

/**
 * POST /subscriptions/apple/status
 * Update current user's Apple subscription status (unverified client flow).
 */
router.post("/apple/status", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const {
      status,
      productId,
      currentPeriodStart,
      currentPeriodEnd,
      originalTransactionId,
      latestTransactionId,
      firstPaidAt,
      lastPaidAt,
    } = req.body || {};

    if (!status || typeof status !== "string") {
      return res.status(400).json({ error: "status is required" });
    }

    const trusted = isTrustedRequest(req);

    const data = {
      status,
      productId: typeof productId === "string" ? productId : null,
      currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart) : null,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
      originalTransactionId: typeof originalTransactionId === "string" ? originalTransactionId : null,
      latestTransactionId: typeof latestTransactionId === "string" ? latestTransactionId : null,
      firstPaidAt: firstPaidAt ? new Date(firstPaidAt) : null,
      lastPaidAt: lastPaidAt ? new Date(lastPaidAt) : null,
      lastEventAt: new Date(),
      verified: trusted,
    };

    await prisma.userSubscriptionStatus.upsert({
      where: {
        userId_platform: {
          userId,
          platform: "apple",
        },
      },
      update: data,
      create: {
        userId,
        platform: "apple",
        ...data,
      },
    });

    const evaluation = await evaluateReferralProgressForReferee(userId);

    return res.json({ success: true, verified: trusted, evaluation: evaluation.status });
  } catch (err) {
    console.error("ERROR POST /subscriptions/apple/status:", err);
    return res.status(500).json({ error: "Failed to update subscription status" });
  }
});

/**
 * POST /subscriptions/apple/link-transaction
 * Link user's subscription to an App Store original transaction id (client-side fallback).
 */
router.post("/apple/link-transaction", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    const { originalTransactionId, latestTransactionId, appAccountToken } = req.body || {};

    if (!originalTransactionId || typeof originalTransactionId !== "string") {
      return res.status(400).json({ error: "originalTransactionId is required" });
    }

    await prisma.userSubscriptionStatus.upsert({
      where: {
        userId_platform: {
          userId,
          platform: "apple",
        },
      },
      update: {
        originalTransactionId,
        latestTransactionId: typeof latestTransactionId === "string" ? latestTransactionId : null,
        appAccountToken: typeof appAccountToken === "string" ? appAccountToken : null,
        lastEventAt: new Date(),
      },
      create: {
        userId,
        platform: "apple",
        status: "unknown",
        verified: false,
        originalTransactionId,
        latestTransactionId: typeof latestTransactionId === "string" ? latestTransactionId : null,
        appAccountToken: typeof appAccountToken === "string" ? appAccountToken : null,
        lastEventAt: new Date(),
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("ERROR POST /subscriptions/apple/link-transaction:", err);
    return res.status(500).json({ error: "Failed to link transaction" });
  }
});

/**
 * POST /subscriptions/apple/notifications
 * App Store Server Notifications v2
 */
router.post("/apple/notifications", async (req, res) => {
  try {
    const { signedPayload } = req.body || {};
    if (!signedPayload || typeof signedPayload !== "string") {
      return res.status(400).json({ error: "signedPayload is required" });
    }

    const verify = process.env.APP_STORE_NOTIFICATION_VERIFY === "true";
    const { decoded: payload, verified } = await verifyOrDecodeSignedPayload(signedPayload, { verify });

    const data = payload?.data || {};
    const { decoded: transactionInfo } = await verifyNestedSignedPayload(data?.signedTransactionInfo, { verify });
    const { decoded: renewalInfo } = await verifyNestedSignedPayload(data?.signedRenewalInfo, { verify });

    const notificationType = payload?.notificationType || null;
    const subtype = payload?.subtype || null;
    const environment = payload?.environment || null;
    const notificationUUID = payload?.notificationUUID || null;
    const bundleId = payload?.data?.bundleId || null;
    const appAppleId = payload?.data?.appAppleId || null;

    const originalTransactionId = transactionInfo?.originalTransactionId || null;
    const latestTransactionId = transactionInfo?.transactionId || null;

    let userId = null;
    if (isUuid(transactionInfo?.appAccountToken)) {
      userId = transactionInfo.appAccountToken;
    }

    if (!userId && originalTransactionId) {
      const linked = await prisma.userSubscriptionStatus.findFirst({
        where: {
          originalTransactionId,
          platform: "apple",
        },
        select: { userId: true },
      });
      userId = linked?.userId || null;
    }

    await prisma.appStoreNotification.create({
      data: {
        notificationUUID,
        notificationType,
        subtype,
        environment,
        bundleId,
        appAppleId,
        userId,
        originalTransactionId,
        latestTransactionId,
        signedPayload,
        decodedPayload: payload || null,
      },
    });

    if (userId && transactionInfo) {
      if (transactionInfo.productId && !["helpem.basic.monthly", "helpem.premium.monthly"].includes(transactionInfo.productId)) {
        return res.json({ success: true, verified, ignored: true });
      }

      const status = determineStatus(transactionInfo);
      const currentPeriodStart = parseAppleDate(transactionInfo.purchaseDate);
      const currentPeriodEnd = parseAppleDate(transactionInfo.expiresDate);

      // Check if this is the user's first paid subscription (for invitee bonus)
      const existingSubscription = await prisma.userSubscriptionStatus.findUnique({
        where: {
          userId_platform: {
            userId,
            platform: "apple",
          },
        },
        select: { firstPaidAt: true },
      });
      const isFirstPaidSubscription = !existingSubscription?.firstPaidAt;

      await prisma.userSubscriptionStatus.upsert({
        where: {
          userId_platform: {
            userId,
            platform: "apple",
          },
        },
        update: {
          productId: transactionInfo.productId || null,
          status,
          verified: verified || false,
          environment,
          appAccountToken: transactionInfo.appAccountToken || null,
          currentPeriodStart,
          currentPeriodEnd,
          firstPaidAt: transactionInfo.originalPurchaseDate
            ? parseAppleDate(transactionInfo.originalPurchaseDate)
            : currentPeriodStart,
          lastPaidAt: currentPeriodStart,
          originalTransactionId,
          latestTransactionId,
          lastEventAt: new Date(),
        },
        create: {
          userId,
          platform: "apple",
          productId: transactionInfo.productId || null,
          status,
          verified: verified || false,
          environment,
          appAccountToken: transactionInfo.appAccountToken || null,
          currentPeriodStart,
          currentPeriodEnd,
          firstPaidAt: transactionInfo.originalPurchaseDate
            ? parseAppleDate(transactionInfo.originalPurchaseDate)
            : currentPeriodStart,
          lastPaidAt: currentPeriodStart,
          originalTransactionId,
          latestTransactionId,
          lastEventAt: new Date(),
        },
      });

      // Grant invitee bonus on first paid subscription (referred users get +1 free month)
      if (isFirstPaidSubscription && verified && originalTransactionId) {
        try {
          await grantInviteeBonusOnFirstSubscription(userId, {
            productId: transactionInfo.productId,
            originalTransactionId,
          });
        } catch (err) {
          console.error("Failed to grant invitee bonus:", err);
        }
      }

      await evaluateReferralProgressForReferee(userId);
    }

    return res.json({ success: true, verified });
  } catch (err) {
    console.error("ERROR POST /subscriptions/apple/notifications:", err);
    return res.status(500).json({ error: "Failed to process notification" });
  }
});

export default router;
