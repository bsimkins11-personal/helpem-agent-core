import Fastify from "fastify";
import { Pool } from "pg";

const fastify = Fastify({ logger: true });

const PORT = Number(process.env.PORT);
const DATABASE_URL = process.env.DATABASE_URL;

// ---- Postgres ----
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ---- Routes ----
fastify.get("/", async () => "API is running");

fastify.get("/health", async () => ({ status: "ok" }));

// 🔎 DB-ONLY HEALTH CHECK
fastify.get("/db-health", async () => {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    return { db: "ok", result: result.rows };
  } catch (err) {
    fastify.log.error("DB HEALTH ERROR:", err);
    return { db: "error", message: err?.message };
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
