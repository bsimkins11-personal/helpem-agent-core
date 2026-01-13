import Fastify from "fastify";
import { Pool } from "pg";

const fastify = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 8080);

// Build DATABASE_URL explicitly from PG vars
function buildDatabaseUrl() {
  const {
    PGHOST,
    PGPORT,
    PGDATABASE,
    PGUSER,
    PGPASSWORD,
  } = process.env;

  if (!PGHOST || !PGPORT || !PGDATABASE || !PGUSER || !PGPASSWORD) {
    throw new Error("Missing Postgres environment variables");
  }

  return `postgresql://${encodeURIComponent(PGUSER)}:${encodeURIComponent(
    PGPASSWORD
  )}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
}

let pool;

function getPool() {
  if (!pool) {
    const connectionString = buildDatabaseUrl();
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // required for Railway
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
