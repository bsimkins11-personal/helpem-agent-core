import Fastify from "fastify";
import { Pool } from "pg";

const fastify = Fastify({ logger: true });

const PORT = Number(process.env.PORT);
const RAW_DATABASE_URL = process.env.DATABASE_URL;

// ✅ Safely normalize DATABASE_URL
const dbUrl = new URL(RAW_DATABASE_URL);
dbUrl.searchParams.set("sslmode", "require");

// ---- Postgres ----
const pool = new Pool({
  connectionString: dbUrl.toString(),
});

// ---- Routes ----
fastify.get("/", async () => "API is running");

fastify.get("/health", async () => ({ status: "ok" }));

fastify.get("/db-health", async () => {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    return { db: "ok", result: result.rows };
  } catch (err) {
    fastify.log.error("DB HEALTH ERROR FULL:", err);
    return { db: "error", message: err?.message ?? "unknown" };
  }
});

// ---- Start ----
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
