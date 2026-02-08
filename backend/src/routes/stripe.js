/**
 * Stripe billing routes
 *
 * - POST /stripe/create-checkout-session  → Create Checkout session
 * - POST /stripe/webhooks                 → Stripe webhook handler
 * - POST /stripe/customer-portal          → Create billing portal session
 * - GET  /stripe/subscription-status      → Get current subscription
 */

import express from "express";
import { prisma } from "../lib/prisma.js";
import { verifySessionToken } from "../lib/sessionAuth.js";
import {
  stripe,
  createCheckoutSession,
  createPortalSession,
  getActiveSubscription,
  upsertSubscriptionFromStripe,
} from "../services/stripeService.js";
import {
  evaluateReferralProgressForReferee,
  grantInviteeBonusOnFirstSubscription,
} from "../services/referralService.js";

const router = express.Router();

/**
 * POST /stripe/create-checkout-session
 * Creates a Stripe Checkout session for a given price.
 */
router.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: "Missing priceId" });
    }

    const webUrl = process.env.WEB_URL || "https://helpem.ai";
    const checkoutSession = await createCheckoutSession(
      session.session.userId,
      null,
      priceId,
      `${webUrl}/app/billing?success=true`,
      `${webUrl}/app/billing?canceled=true`
    );

    res.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

/**
 * POST /stripe/customer-portal
 * Opens the Stripe billing portal for subscription management.
 */
router.post("/customer-portal", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const portalSession = await createPortalSession(session.session.userId);
    res.json({ url: portalSession.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

/**
 * GET /stripe/subscription-status
 * Returns the current Stripe subscription for the authenticated user.
 */
router.get("/subscription-status", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const subscription = await getActiveSubscription(session.session.userId);

    if (!subscription) {
      return res.json({ subscription: null, plan: "free" });
    }

    // Determine plan from productId
    let plan = "free";
    if (subscription.productId?.includes("premium")) {
      plan = "premium";
    } else if (subscription.productId?.includes("basic")) {
      plan = "basic";
    }

    res.json({
      subscription: {
        status: subscription.status,
        productId: subscription.productId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        platform: subscription.platform,
      },
      plan,
    });
  } catch (err) {
    console.error("Stripe status error:", err);
    res.status(500).json({ error: "Failed to get subscription status" });
  }
});

/**
 * POST /stripe/webhooks
 * Stripe webhook handler. Must use raw body for signature verification.
 * Note: This route is registered separately with express.raw() middleware.
 */
export async function handleStripeWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).send("Webhook secret not configured");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency check
  const existing = await prisma.stripeEvent.findUnique({
    where: { eventId: event.id },
  });
  if (existing?.processed) {
    return res.json({ received: true, status: "already_processed" });
  }

  // Record event
  await prisma.stripeEvent.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      eventType: event.type,
      payload: event.data.object,
    },
    update: {},
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await upsertSubscriptionFromStripe(subscription);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const result = await upsertSubscriptionFromStripe(subscription);

          // Check referral bonuses on first paid subscription
          if (result) {
            await grantInviteeBonusOnFirstSubscription(result.userId, result);
            await evaluateReferralProgressForReferee(result.userId);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          await upsertSubscriptionFromStripe(subscription);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await upsertSubscriptionFromStripe(subscription);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    // Mark as processed
    await prisma.stripeEvent.update({
      where: { eventId: event.id },
      data: { processed: true },
    });
  } catch (err) {
    console.error(`Error processing Stripe event ${event.type}:`, err);
    // Don't mark as processed so it can be retried
  }

  res.json({ received: true });
}

export default router;
