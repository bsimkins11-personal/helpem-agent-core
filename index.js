import Fastify from "fastify";

const fastify = Fastify({ logger: true });

const PORT = Number(process.env.PORT);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ---- In-memory session store ----
const sessionMemory = new Map();
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
  sessionMemory.set(sessionId, history.slice(-MAX_TURNS * 2));
}

// ---- Routes ----
fastify.get("/", async () => "API is running");
fastify.get("/health", async () => ({ status: "ok" }));

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

  const history = getHistory(session_id);
  appendToHistory(session_id, { role: "user", content: message });

  try {
    // 🔒 HARD GROUNDING PROMPT
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
  } catch {
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
