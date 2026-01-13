import Fastify from "fastify";
import { Pool } from "pg";

const fastify = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 8080);
const DATABASE_URL = process.env.DATABASE_URL;

// ---- Postgres (only if DATABASE_URL exists) ----
let pool = null;
if (DATABASE_URL) {
  pool = new Pool({ connectionString: DATABASE_URL });
  pool.on("error", (err) => {
    console.error("Postgres pool error:", err);
  });
}

// ---- Routes ----
fastify.get("/", async () => {
  return "API is running";
});

fastify.get("/health", async () => {
  return { status: "ok" };
});

fastify.get("/db-health", async () => {
  if (!pool) {
    return { db: "skipped", reason: "DATABASE_URL not set" };
  }
  try {
    const result = await pool.query("SELECT 1 AS ok");
    return { db: "ok", result: result.rows };
  } catch (err) {
    fastify.log.error("DB HEALTH ERROR:", err);
    return { db: "error", message: err?.message ?? "unknown" };
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
