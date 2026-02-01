import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import { execSync } from "child_process";
import { verifyAppleIdentityToken } from "./src/lib/appleAuth.js";
import { createSessionToken, verifySessionToken } from "./src/lib/sessionAuth.js";
import { prisma } from "./src/lib/prisma.js";
import { migrateFeedbackTable } from "./src/migrate-feedback.js";
import tribeRoutes from "./src/routes/tribe.js";
import tribeInviteLinksRoutes from "./src/routes/tribe-invite-links.js";
import googleCalendarRoutes from "./src/routes/google-calendar.js";
import notificationsRoutes from "./src/routes/notifications.js";
import debugTribesHandler from './routes/debug-tribes.js';
import demoTribesRoutes from './routes/demo-tribes.js';
import demoTribesCleanupRoutes from './routes/demo-tribes-cleanup.js';

// Run migrations on startup
async function runMigrations() {
  try {
    console.log("🔄 Running database migrations...");
    execSync("npx prisma migrate deploy", { 
      stdio: "inherit",
      env: { ...process.env }
    });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("⚠️ Migration warning:", error.message);
    console.log("📝 Continuing startup - some migrations may need manual attention");
  }
}

const app = express();

// Trust proxy for Railway/Heroku/etc (required for rate limiting behind proxy)
// In production, trust only first hop; in development, use loopback
const trustProxyValue = process.env.NODE_ENV === "production" ? 1 : "loopback";
app.set('trust proxy', trustProxyValue);

const port = process.env.PORT || 8080;
const MAX_BIAS_ENTRIES = 200;
const GLOBAL_RULE_KEY = "classification_biases_v1";
const USER_INPUTS_TABLE = "user_inputs";

const isMissingUserInputsTable = (err) => {
  const message = typeof err?.message === "string" ? err.message : "";
  return (
    err?.code === "P2021" ||
    err?.code === "42P01" ||
    (message.includes(USER_INPUTS_TABLE) && message.includes("does not exist"))
  );
};

const ensureUserInputsTable = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "user_inputs" (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      type text NOT NULL DEFAULT 'text',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_user_inputs_user_id"
    ON "user_inputs" ("user_id");
  `);
};

// Middleware - Secure CORS configuration
const allowedOrigins = [
  "https://helpem.ai",
  "https://www.helpem.ai",
  "http://localhost:3000", // Local development
  "http://localhost:3001", // Alternative dev port
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(bodyParser.json({ limit: "10mb" })); // Limit payload size

// Rate limiters - Protect against abuse
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per IP
  message: "Too many authentication attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes per IP
  message: "Too many requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour (for sensitive operations)
  message: "Rate limit exceeded. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// =============================================================================
// AUTH ENDPOINTS
// =============================================================================

/**
 * POST /auth/apple
 * 
 * Authenticates a user via Sign in with Apple.
 * Issues an app-owned session token.
 */
app.post("/auth/apple", authLimiter, async (req, res) => {
  console.log("ROUTE HIT: POST /auth/apple");

  try {
    const { apple_user_id, identity_token } = req.body;

    // Validate required fields
    if (!apple_user_id || typeof apple_user_id !== "string") {
      return res.status(400).json({ error: "Missing or invalid apple_user_id" });
    }

    if (!identity_token || typeof identity_token !== "string") {
      return res.status(400).json({ error: "Missing or invalid identity_token" });
    }

    // Verify Apple identity token
    const appleAuth = await verifyAppleIdentityToken(identity_token);

    if (!appleAuth.success) {
      console.error("Apple auth failed:", appleAuth.error);
      return res.status(appleAuth.status).json({ error: appleAuth.error });
    }

    // Security check: Ensure the token's sub matches the provided apple_user_id
    if (appleAuth.user.id !== apple_user_id) {
      console.error(
        "Apple user ID mismatch:",
        `token.sub=${appleAuth.user.id}`,
        `provided=${apple_user_id}`
      );
      return res.status(401).json({ error: "Apple user ID mismatch" });
    }

    // Extract email from Apple token (if user shared it)
    const appleEmail = appleAuth.user.email;

    const user = await prisma.user.upsert({
      where: { appleUserId: apple_user_id },
      update: {
        lastActiveAt: new Date(),
        // Update email if provided and not already set
        ...(appleEmail ? { email: appleEmail.toLowerCase() } : {}),
      },
      create: {
        appleUserId: apple_user_id,
        lastActiveAt: new Date(),
        email: appleEmail ? appleEmail.toLowerCase() : null,
      },
      select: { id: true, createdAt: true, email: true },
    });

    const userId = user.id;

    // Determine if this is a new user (createdAt is very recent)
    const createdAt = new Date(user.createdAt);
    const now = new Date();
    const isNewUser = now.getTime() - createdAt.getTime() < 5000;

    // For new users, check for pending tribe invitations matching their email
    if (isNewUser && user.email) {
      try {
        console.log(`New user ${userId} signed up with email ${user.email} - checking for pending tribe invitations...`);

        // Find pending invitations matching this email
        const pendingInvitations = await prisma.pendingTribeInvitation.findMany({
          where: {
            contactIdentifier: user.email.toLowerCase(),
            state: "pending",
          },
        });

        if (pendingInvitations.length > 0) {
          console.log(`Found ${pendingInvitations.length} pending invitations for ${user.email}`);
          // Note: We don't auto-accept - user will see these invitations in-app
          // and can choose to accept or decline
        }
      } catch (err) {
        console.error("Error processing pending tribe invitations:", err);
        // Don't fail auth if tribe invitation processing fails
      }
    }

    // Issue app-owned session token
    const sessionToken = createSessionToken(userId, apple_user_id);

    console.log(
      `✅ Auth success: user=${userId}, apple_user=${apple_user_id.substring(0, 10)}..., new=${isNewUser}`
    );

    return res.json({
      session_token: sessionToken,
      user_id: userId,
      is_new_user: isNewUser,
    });

  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
});

/**
 * GET /auth/apple
 * Health check for auth service
 */
app.get("/auth/apple", (_req, res) => {
  res.json({
    status: "ok",
    service: "auth/apple",
    version: "1.0.0",
  });
});

// --- TEST ROUTE (PRODUCTION-STYLE) ---
app.post("/test-db", apiLimiter, async (req, res) => {
  console.log("ROUTE HIT: POST /test-db");

  try {
    // 🔐 Verify Apple identity token
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const userId = session.session.userId;
    console.log("SESSION USER ID:", userId);

    const { message, type } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    const insertUserInputRaw = async () => {
      try {
        await prisma.$executeRaw`
          INSERT INTO user_inputs (user_id, content, type, created_at)
          VALUES (${userId}::uuid, ${message}, ${type || "text"}, NOW())
        `;
      } catch (rawErr) {
        console.warn("type column not found, creating without it (migration may be needed)");
        await prisma.$executeRaw`
          INSERT INTO user_inputs (user_id, content, created_at)
          VALUES (${userId}::uuid, ${message}, NOW())
        `;
      }
    };

    try {
      // Try to create with type field
      try {
        await prisma.userInput.create({
          data: {
            userId,
            content: message,
            type: type || "text",
          },
        });
      } catch (typeError) {
        const msg = typeError?.message || "";
        // If type column doesn't exist or id type mismatch, fallback to raw insert
        if (
          typeError.code === 'P2022' ||
          msg.includes("type") ||
          msg.includes("Expected a string in column 'id'")
        ) {
          await insertUserInputRaw();
        } else {
          throw typeError;
        }
      }
    } catch (err) {
      if (isMissingUserInputsTable(err)) {
        console.warn("⚠️ user_inputs table missing, creating...");
        try {
          await ensureUserInputsTable();
          try {
            await prisma.userInput.create({
              data: {
                userId,
                content: message,
                type: type || "text",
              },
            });
          } catch (typeError2) {
            const msg = typeError2?.message || "";
            if (
              typeError2.code === 'P2022' ||
              msg.includes("type") ||
              msg.includes("Expected a string in column 'id'")
            ) {
              await insertUserInputRaw();
            } else {
              throw typeError2;
            }
          }
        } catch (retryErr) {
          console.error("ERROR /test-db (log skipped):", retryErr);
          return res.json({
            success: false,
            message: "Log skipped due to database error",
            responseType: type === "text" ? "text" : "voice",
          });
        }
      } else {
        console.error("ERROR /test-db (log skipped):", err);
        return res.json({
          success: false,
          message: "Log skipped due to database error",
          responseType: type === "text" ? "text" : "voice",
        });
      }
    }

    // Response mirrors production pattern
    if (type === "text") {
      return res.json({
        success: true,
        message: "Text saved successfully",
        responseType: "text",
      });
    } else {
      return res.json({
        success: true,
        message: "Voice saved and processed",
        responseType: "voice",
      });
    }
  } catch (err) {
    console.error("ERROR /test-db:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Health check
app.get("/", (_req, res) => {
  res.send("API is running");
});

// Health check with optional DB probe
app.get("/health", async (_req, res) => {
  const dbHealthEnabled = process.env.ENABLE_DB_HEALTH === "true";

  if (!dbHealthEnabled) {
    return res.json({ status: "ok", db: "skipped" });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ok", db: "ok" });
  } catch (error) {
    console.error("DB health check failed:", error);
    return res.status(500).json({ status: "error", db: "error" });
  }
});

// =============================================================================
// INSTRUCTION / FEEDBACK ENDPOINTS
// =============================================================================

// Record a user correction/feedback event to make personal bias smarter.
app.post("/feedback", apiLimiter, async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    const userId = session.session.userId;

    const { text, from, to, timestamp } = req.body || {};
    if (typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid text" });
    }
    if (!["todo", "grocery"].includes(to)) {
      return res.status(400).json({ error: "Invalid target type" });
    }

    const normalized = normalizeText(text);
    if (!normalized) {
      return res.status(400).json({ error: "Empty text" });
    }

    const seenAt = parseTimestamp(timestamp);

    const existing = await prisma.userInstruction.findUnique({
      where: { userId },
    });

    const data = existing?.data ?? {};
    const biases = data.biases ?? {};
    const prior = biases[normalized] ?? { direction: to, count: 0 };

    biases[normalized] = {
      direction: to,
      count: (prior.count || 0) + 1,
      lastSeen: seenAt,
      from: from || prior.from || null,
    };

    pruneBiases(biases);

    const nextData = { ...data, biases };

    await prisma.userInstruction.upsert({
      where: { userId },
      update: { data: nextData },
      create: { userId, data: nextData },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("ERROR /feedback:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch the current user instruction doc (for client-side biasing).
app.get("/instructions/me", apiLimiter, async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    const userId = session.session.userId;

    const instruction = await prisma.userInstruction.findUnique({
      where: { userId },
    });

    return res.json({ data: instruction?.data ?? {} });
  } catch (err) {
    console.error("ERROR /instructions/me:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Debug: fetch current global rules snapshot.
app.get("/rules/global", apiLimiter, async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }

    const rule = await prisma.globalRule.findUnique({
      where: { key: GLOBAL_RULE_KEY },
    });

    return res.json({ data: rule?.data ?? {} });
  } catch (err) {
    console.error("ERROR /rules/global:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseTimestamp(ts) {
  const d = ts ? new Date(ts) : new Date();
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function pruneBiases(biases) {
  const keys = Object.keys(biases);
  if (keys.length <= MAX_BIAS_ENTRIES) return;

  keys
    .sort((a, b) => {
      const aTime = biases[a].lastSeen || "";
      const bTime = biases[b].lastSeen || "";
      return aTime > bTime ? -1 : 1;
    })
    .slice(MAX_BIAS_ENTRIES)
    .forEach((key) => delete biases[key]);
}

// Migration endpoint (one-time use to create feedback table)
app.get("/migrate-feedback", async (req, res) => {
  try {
    const result = await migrateFeedbackTable();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================================================
// GOOGLE CALENDAR ROUTES
// =============================================================================

app.use("/google", apiLimiter, googleCalendarRoutes);

// =============================================================================
// NOTIFICATIONS ROUTES
// =============================================================================

app.use("/notifications", apiLimiter, notificationsRoutes);

// =============================================================================
// TRIBE ROUTES
// =============================================================================

// Demo tribes must come BEFORE general tribes route for proper matching
app.use("/tribes/demo/cleanup", apiLimiter, demoTribesCleanupRoutes);
app.use("/tribes/demo", apiLimiter, demoTribesRoutes);
app.use("/tribes", apiLimiter, tribeInviteLinksRoutes); // Invite links
app.use("/tribes", apiLimiter, tribeRoutes);

// =============================================================================
// DEBUG ROUTES (temporary)
// =============================================================================

import debugUserStateHandler from './routes/debug-user-state.js';
app.get("/debug/tribes", debugTribesHandler);
app.get("/debug/user-state", debugUserStateHandler);

// Temporary: Clear pending invitations for testing
app.get("/debug/clear-invitations", async (req, res) => {
  try {
    const deleted = await prisma.pendingTribeInvitation.deleteMany({
      where: { state: "pending" }
    });
    console.log(`Deleted ${deleted.count} pending invitations`);
    return res.json({ success: true, deleted: deleted.count });
  } catch (err) {
    console.error("Error clearing invitations:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Temporary: List pending invitations
app.get("/debug/pending-invitations", async (req, res) => {
  try {
    const invitations = await prisma.pendingTribeInvitation.findMany({
      orderBy: { createdAt: "desc" }
    });
    return res.json({ count: invitations.length, invitations });
  } catch (err) {
    console.error("Error listing invitations:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Temporary: Check user by phone
app.get("/debug/user-by-phone/:phone", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { phone: req.params.phone }
    });
    return res.json({ found: !!user, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Temporary: List all users
app.get("/debug/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, phone: true, createdAt: true }
    });
    return res.json({ count: users.length, users });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Debug: Who am I (get current user ID from auth token)
app.get("/debug/whoami", async (req, res) => {
  try {
    const session = await verifySessionToken(req);
    if (!session.success) {
      return res.status(session.status).json({ error: session.error });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.session.userId },
      select: { id: true, email: true, phone: true, createdAt: true }
    });
    return res.json({ userId: session.session.userId, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Temporary: List active devices (to identify users)
app.get("/debug/devices", async (req, res) => {
  try {
    const devices = await prisma.userDevice.findMany({
      orderBy: { lastActiveAt: 'desc' },
      take: 10,
    });
    return res.json({
      count: devices.length,
      devices: devices.map(d => ({
        userId: d.userId,
        deviceName: d.deviceName,
        platform: d.platform,
        lastActiveAt: d.lastActiveAt,
        notificationsEnabled: d.notificationsEnabled,
      }))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Temporary: List recent tribe activities
app.get("/debug/activities", async (req, res) => {
  try {
    const activities = await prisma.tribeActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { tribe: { select: { id: true, name: true } } }
    });
    return res.json({
      count: activities.length,
      activities: activities.map(a => ({
        type: a.type,
        tribeId: a.tribeId,
        tribeName: a.tribe?.name,
        actorId: a.actorId,
        targetUserId: a.targetUserId,
        metadata: a.metadata,
        createdAt: a.createdAt,
      }))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Temporary: Clean up duplicate invitations for a tribe
app.post("/debug/cleanup-invitations/:tribeId", async (req, res) => {
  try {
    const { keepUserId } = req.body; // Keep only this user's invitation
    const tribeId = req.params.tribeId;

    // Get owner to exclude
    const tribe = await prisma.tribe.findUnique({ where: { id: tribeId } });
    if (!tribe) return res.status(404).json({ error: "Tribe not found" });

    // Delete all pending invitations except owner and keepUserId
    const deleted = await prisma.tribeMember.deleteMany({
      where: {
        tribeId,
        acceptedAt: null,
        userId: {
          notIn: keepUserId ? [tribe.ownerId, keepUserId] : [tribe.ownerId]
        }
      }
    });

    return res.json({ success: true, deleted: deleted.count });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Temporary: Check invitations for a user
app.get("/debug/invitations-for/:userId", async (req, res) => {
  try {
    const pending = await prisma.tribeMember.findMany({
      where: {
        userId: req.params.userId,
        acceptedAt: null,
        leftAt: null,
      },
      include: { tribe: true }
    });
    return res.json({ count: pending.length, invitations: pending });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Temporary: List tribe members
app.get("/debug/tribe-members/:tribeId", async (req, res) => {
  try {
    const members = await prisma.tribeMember.findMany({
      where: { tribeId: req.params.tribeId },
      select: { id: true, userId: true, acceptedAt: true, invitedAt: true, leftAt: true }
    });
    return res.json({ count: members.length, members });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Temporary: Add user to tribe directly (for testing)
app.post("/debug/add-member", async (req, res) => {
  try {
    const { tribeId, userId, invitedBy } = req.body;

    // Create tribe member
    const member = await prisma.tribeMember.create({
      data: {
        tribeId,
        userId,
        invitedBy,
        invitedAt: new Date(),
        // Don't auto-accept - they need to accept
      }
    });

    // Send push notification
    const { sendToUser, isPushEnabled } = await import('./src/services/pushNotificationService.js');
    const tribe = await prisma.tribe.findUnique({ where: { id: tribeId } });

    if (isPushEnabled()) {
      await sendToUser(userId, {
        title: "You've been invited!",
        body: `Join the "${tribe.name}" tribe`,
        category: "TRIBE_INVITE",
        data: { type: "tribe_invite", tribeId, memberId: member.id }
      });
    }

    return res.json({ success: true, member, notificationSent: isPushEnabled() });
  } catch (err) {
    console.error("Error adding member:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Start server with migrations
(async () => {
  // Run migrations before starting server
  await runMigrations();
  
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
})();
