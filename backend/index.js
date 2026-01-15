import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Pool } from "pg";
import { verifyAppleToken, verifyAppleIdentityToken } from "./src/lib/appleAuth.js";
import { createSessionToken, verifySessionToken } from "./src/lib/sessionAuth.js";

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
app.post("/auth/apple", async (req, res) => {
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

    // Upsert user in database
    const client = await pool.connect();
    let user;
    try {
      const result = await client.query(
        `INSERT INTO users (apple_user_id)
         VALUES ($1)
         ON CONFLICT (apple_user_id) DO UPDATE SET apple_user_id = EXCLUDED.apple_user_id
         RETURNING id, created_at`,
        [apple_user_id]
      );
      user = result.rows[0];
    } finally {
      client.release();
    }

    const userId = user.id;

    // Determine if this is a new user (created_at is very recent)
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const isNewUser = now.getTime() - createdAt.getTime() < 5000;

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
app.post("/test-db", async (req, res) => {
  console.log("ROUTE HIT: POST /test-db");

  try {
    // 🔐 Verify Apple identity token
    const auth = await verifyAppleToken(req);
    if (!auth.success) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const userId = auth.user.id;
    console.log("APPLE USER SUB:", userId);

    const { message, type } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    // Save to database
    const client = await pool.connect();
    try {
      await client.query(
        "INSERT INTO user_inputs (user_id, content, type) VALUES ($1, $2, $3)",
        [userId, message, type || "text"]
      );
    } finally {
      client.release();
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

// Start server
app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
