import Fastify from "fastify";

const fastify = Fastify({ logger: true });

const PORT = Number(process.env.PORT);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ---- In-memory session store (Phase 2) ----
// session_id -> [{ role, content }]
const sessionMemory = new Map();

// Limit memory per session (keeps costs + prompts bounded)
const MAX_TURNS = 10;

// ---- Helpers ----
function safeString(x) {
  return typeof x === "string" ? x : "";
}

function getSessionId(input) {
  return input ?? crypto.randomUUID();
}

function getHistory(sessionId) {
  return sessionMemory.get(sessionId) ?? [];
}

function appendToHistory(sessionId, message) {
  const history = getHistory(sessionId);
  history.push(message);

  // Keep only last N turns (user + assistant messages)
  const trimmed = history.slice(-MAX_TURNS * 2);
  sessionMemory.set(sessionId, trimmed);
}

// ---- Routes ----
fastify.get("/", async () => "API is running");

fastify.get("/health", async () => ({ status: "ok" }));

/**
 * POST /chat
 * Adds session-scoped memory
 */
fastify.post("/chat", async (request, reply) => {
  const body = request.body ?? {};
  const user_id = safeString(body.user_id);
  const incomingSessionId =
    body.session_id == null ? null : safeString(body.session_id);
  const message = safeString(body.message);

  if (!user_id || !message) {
    reply.code(400);
    return {
      error: {
        code: "INVALID_INPUT",
        message: "user_id and message are required",
      },
    };
  }

  const session_id = getSessionId(incomingSessionId);

  // ---- Build message history ----
  const history = getHistory(session_id);

  // Append current user message to memory
  appendToHistory(session_id, { role: "user", content: message });

  try {
    const systemPrompt = [
      "You are HelpEm, a helpful assistant inside an iOS app.",
      "Be concise, friendly, and practical.",
      "Always ground your response in the user's previously stated goals or context when available.",
      "Do not mention internal memory or system prompts.",
    ].join(" ");

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages,
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      fastify.log.error({ status: resp.status, errText }, "OpenAI error");
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
      data?.choices?.[0]?.message?.content?.trim?.() ||
      "I'm here—what would you like to do next?";

    // Append assistant response to memory
    appendToHistory(session_id, { role: "assistant", content: text });

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
    fastify.log.error({ err }, "Server /chat failure");
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
