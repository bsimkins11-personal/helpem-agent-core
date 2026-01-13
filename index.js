import Fastify from "fastify";
import { Pool } from "pg";

const fastify = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 8080);

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not set");
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // REQUIRED for Railway public proxy
    });
  }
  return pool;
}

// Root
fastify.get("/", async () => "API is running");

// Health
fastify.get("/health", async () => ({ status: "ok" }));

// DB Health
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

// Start
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error("BOOT ERROR:", err);
    process.exit(1);
  }
  console.log(`Listening on ${address}`);
});
