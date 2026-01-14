import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Pool } from "pg";
import { verifyAppleToken } from "./src/lib/appleAuth.js";

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
