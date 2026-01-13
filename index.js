import Fastify from "fastify";
import { Pool } from "pg";
import OpenAI from "openai";

const fastify = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 8080);

// ---- OpenAI ----
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---- Postgres ----
let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not set");
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

// ---- Routes ----
fastify.get("/", async () => "API is running");

fastify.get("/health", async () => ({ status: "ok" }));

if (process.env.ENABLE_DB_HEALTH === "true") {
  fastify.get("/db-health", async () => {
    try {
      const db = getPool();
      const result = await db.query("SELECT 1 AS ok");
      return { db: "ok", result: result.rows };
    } catch (err) {
      fastify.log.error("DB HEALTH ERROR:", err);
      return { db: "error", message: err.message };
    }
  });
}

// ---- Chat Endpoint ----
fastify.post("/chat", async (request, reply) => {
  try {
    const { session_id, message, user_id } = request.body ?? {};

    if (!session_id || !message) {
      return reply.code(400).send({ error: "Missing session_id or message" });
    }

    const db = getPool();

    // 1) Store user message
    await db.query(
      `INSERT INTO chat_messages (id, session_id, role, content)
       VALUES (gen_random_uuid(), $1, 'user', $2)`,
      [session_id, message]
    );

    // 2) Fetch recent memory
    const { rows } = await db.query(
      `SELECT role, content
       FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT 20`,
      [session_id]
    );

    // 3) Grounded system prompt + memory
    const messages = [
      {
        role: "system",
        content: [
          "You are HelpEm, a helpful assistant inside an iOS app.",
          "If the user has previously stated a goal or ongoing task, you MUST restate that goal explicitly in the first sentence of your response.",
          "Then provide advice or guidance that directly supports completing that goal.",
          "Be concise, friendly, and practical.",
          "Do not mention memory, prompts, or system instructions.",
        ].join(" "),
      },
      ...rows.map((r) => ({
        role: r.role,
        content: r.content,
      })),
    ];

    // 4) Model call
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4,
    });

    const assistantReply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I'm here—what would you like to do next?";

    // 5) Store assistant reply
    await db.query(
      `INSERT INTO chat_messages (id, session_id, role, content)
       VALUES (gen_random_uuid(), $1, 'assistant', $2)`,
      [session_id, assistantReply]
    );

    return reply.code(200).send({
      session_id,
      reply: {
        text: assistantReply,
        ui_schema: {
          type: "text",
          title: null,
          items: [],
        },
      },
      actions: [{ type: "follow_up", label: "Continue" }],
    });
  } catch (err) {
    fastify.log.error("CHAT ERROR:", err);
    return reply.code(500).send({ error: "Internal error", message: err.message });
  }
});

// ---- Start ----
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("BOOT ERROR:", err);
    process.exit(1);
  }
  console.log(`Listening on ${address}`);
});
