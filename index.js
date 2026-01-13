import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

const PORT = Number(process.env.PORT);

// Root route
fastify.get("/", async () => {
  return "API is running";
});

// Health check
fastify.get("/health", async () => {
  return { status: "ok" };
});

// Start server
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server listening at ${address}`);
});
