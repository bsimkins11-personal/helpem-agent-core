import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Map Stripe price IDs to internal product IDs
const PRICE_TO_PRODUCT = {
  [process.env.STRIPE_BASIC_MONTHLY_PRICE_ID]: "helpem.basic.monthly",
  [process.env.STRIPE_BASIC_ANNUAL_PRICE_ID]: "helpem.basic.annual",
  [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID]: "helpem.premium.monthly",
  [process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID]: "helpem.premium.annual",
};

/**
 * Get or create a Stripe customer for a user.
 */
export async function createOrGetCustomer(userId, email) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true, displayName: true },
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customerEmail = email || user?.email;
  const customer = await stripe.customers.create({
    metadata: { userId },
    ...(customerEmail && { email: customerEmail }),
    ...(user?.displayName && { name: user.displayName }),
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout session for subscription.
 */
export async function createCheckoutSession(userId, email, priceId, successUrl, cancelUrl) {
  const customerId = await createOrGetCustomer(userId, email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { userId },
    },
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create a Stripe Customer Portal session.
 */
export async function createPortalSession(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error("No Stripe customer found");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.WEB_URL || "https://helpem.ai"}/app/billing`,
  });

  return session;
}

/**
 * Get active subscription for a user.
 * Checks Stripe first, then falls back to Apple.
 */
export async function getActiveSubscription(userId) {
  const stripeSub = await prisma.userSubscriptionStatus.findUnique({
    where: {
      userId_platform: { userId, platform: "stripe" },
    },
  });
  if (stripeSub) return stripeSub;

  // Fallback to Apple subscription
  return prisma.userSubscriptionStatus.findUnique({
    where: {
      userId_platform: { userId, platform: "apple" },
    },
  });
}

/**
 * Map Stripe subscription status to our internal status.
 */
function mapStripeStatus(stripeStatus) {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "billing_retry";
    case "canceled":
    case "unpaid":
      return "expired";
    case "incomplete":
    case "incomplete_expired":
      return "revoked";
    default:
      return "unknown";
  }
}

/**
 * Upsert subscription status from a Stripe subscription object.
 */
export async function upsertSubscriptionFromStripe(subscription) {
  const customerId = subscription.customer;

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });

  if (!user) {
    console.error("No user found for Stripe customer:", customerId);
    return null;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const productId = PRICE_TO_PRODUCT[priceId] || priceId;
  const status = mapStripeStatus(subscription.status);

  const data = {
    platform: "stripe",
    productId,
    status,
    verified: true,
    environment: subscription.livemode ? "Production" : "Sandbox",
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    originalTransactionId: subscription.id,
    latestTransactionId: subscription.latest_invoice,
    lastEventAt: new Date(),
  };

  // Set firstPaidAt on first active subscription
  if (status === "active") {
    data.lastPaidAt = new Date(subscription.current_period_start * 1000);
  }

  const result = await prisma.userSubscriptionStatus.upsert({
    where: {
      userId_platform: { userId: user.id, platform: "stripe" },
    },
    create: {
      userId: user.id,
      ...data,
      firstPaidAt: status === "active" ? new Date() : null,
    },
    update: data,
  });

  return result;
}

/**
 * Apply a credit (e.g. referral reward) to a Stripe customer.
 * Uses Stripe credit balance (negative = credit to customer).
 */
export async function applyCustomerCredit(stripeCustomerId, amountCents, description) {
  const balanceTransaction = await stripe.customers.createBalanceTransaction(
    stripeCustomerId,
    {
      amount: -Math.abs(amountCents), // Negative = credit
      currency: "usd",
      description,
    }
  );

  return balanceTransaction;
}

export { stripe };
