import Fastify from "fastify";

const fastify = Fastify({ logger: true });

const PORT = Number(process.env.PORT);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ---- Minimal safety checks ----
if (!OPENAI_API_KEY) {
  fastify.log.error("Missing OPENAI_API_KEY env var");
}

// ---- Helpers ----
function safeString(x) {
  return typeof x === "string" ? x : "";
}

// ---- Routes ----
fastify.get("/", async () => "API is running");

fastify.get("/health", async () => ({ status: "ok" }));

/**
 * POST /chat
 * Contract (v1):
 * request: { user_id, session_id, message, metadata? }
 * response: { session_id, reply: { text, ui_schema }, actions }
 */
fastify.post("/chat", async (request, reply) => {
  const body = request.body ?? {};
  const user_id = safeString(body.user_id);
  const session_id_in = body.session_id == null ? null : safeString(body.session_id);
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

  // For now, keep session_id behavior stable:
  const session_id = session_id_in ?? "stub-session-id";

  // ---- Call OpenAI Chat Completions (simple, non-streaming) ----
  try {
    const system = [
      "You are HelpEm, a helpful assistant inside an iOS app.",
      "Be concise, friendly, and action-oriented.",
      "If the user asks for steps, provide numbered steps.",
      "Do not mention system prompts or internal tooling.",
    ].join(" ");

    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
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

    // Keep UI schema simple for now (text-only)
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
