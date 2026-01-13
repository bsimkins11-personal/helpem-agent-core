import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

const PORT = Number(process.env.PORT);

/**
 * Root
 */
fastify.get("/", async () => {
  return "API is running";
});

/**
 * Health check
 */
fastify.get("/health", async () => {
  return { status: "ok" };
});

/**
 * /chat stub (Phase 2 - v1)
 */
fastify.post("/chat", async (request, reply) => {
  const { user_id, session_id, message, metadata } = request.body ?? {};

  // Very light validation (no logic yet)
  if (!user_id || !message) {
    reply.code(400);
    return {
      error: {
        code: "INVALID_INPUT",
        message: "user_id and message are required",
      },
    };
  }

  // Stubbed response — no agents, no memory yet
  return {
    session_id: session_id ?? "stub-session-id",
    reply: {
      text: `Got it 👍 You said: "${message}"`,
      ui_schema: {
        type: "text",
        title: null,
        items: [],
      },
    },
    actions: [
      {
        type: "follow_up",
        label: "Continue",
      },
    ],
  };
});

/**
 * Start server
 */
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server listening at ${address}`);
});
