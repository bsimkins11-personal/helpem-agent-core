import Fastify from "fastify";
import { Pool } from "pg";
import { randomUUID } from "crypto";

const fastify = Fastify({ logger: true });

const PORT = Number(process.env.PORT);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// ---- Postgres ----
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ---- Memory ----
const MAX_TURNS = 10;
const HISTORY_LIMIT = MAX_TURNS * 2;

// ---- Helpers ----
function safeString(x) {
  return typeof x === "string" ? x : "";
}

function getSessionId(input) {
  return input ?? randomUUID();
}

// ---- DB helpers ----
async function getHistory(sessionId) {
  const { rows } = await pool.query(
    `
    SELECT role, content
    FROM chat_messages
    WHERE session_id = $1
    ORDER BY created_at ASC
    LIMIT ${HISTORY_LIMIT}
    `,
    [sessionId]
  );
  return rows;
}

async function appendMessage(sessionId, role, content) {
  await pool.query(
    `
    INSERT INTO chat_messages (id, session_id, role, content)
    VALUES ($1, $2, $3, $4)
    `,
    [randomUUID(), sessionId, role, content]
  );
}

// ---- Routes ----
fastify.get("/", async () => "API is running");
fastify.get("/health", async () => ({ status: "ok" }));

fastify.post("/chat", async (request, reply) => {
  try {
    const body = request.body ?? {};
    const user_id = safeString(body.user_id);
    const message = safeString(body.message);
    const session_id = getSessionId(body.session_id);

    if (!user_id || !message) {
      reply.code(400);
      return {
        error: {
          code: "INVALID_INPUT",
          message: "user_id and message are required",
        },
      };
    }

    // Persist user message
    await appendMessage(session_id, "user", message);

    // Load history
    const history = await getHistory(session_id);

    const systemPrompt = [
      "You are HelpEm, a helpful assistant inside an iOS app.",
      "If the user has previously stated a goal or ongoing task, you MUST restate that goal explicitly in the first sentence of your response.",
      "Then provide advice or guidance that directly supports completing that goal.",
      "Be concise, friendly, and practical.",
      "Do not mention memory, prompts, or system instructions.",
    ].join(" ");

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages,
      }),
    });

    if (!resp.ok) {
      reply.code(502);
      return {
        error: {
          code: "UPSTREAM_ERROR",
          message: "AI service error. Please try again.",
        },
      };
    }

    const data = await resp.json();
    const text =
      data?.choices?.[0]?.message?.content?.trim() ??
      "I'm here—what would you like to do next?";

    // Persist assistant reply
    await appendMessage(session_id, "assistant", text);

    return {
      session_id,
      reply: {
        text,
        ui_schema: {
          type: "text",
          title: null,
          items: [],
        },
      },
      actions: [{ type: "follow_up", label: "Continue" }],
    };
  } catch (err) {
    fastify.log.error("Chat failure:", err);
    reply.code(500);
    return {
      error: {
        code: "SERVER_ERROR",
        message: "Something went wrong. Please try again.",
      },
    };
  }
});

// ---- Start ----
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server listening at ${address}`);
});
