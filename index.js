import Fastify from "fastify";

const fastify = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 8080);

// Root
fastify.get("/", async () => {
  return "API is running";
});

// Health
fastify.get("/health", async () => {
  return { status: "ok" };
});

// Start
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("BOOT ERROR:", err);
    process.exit(1);
  }
  console.log(`Listening on ${address}`);
});
