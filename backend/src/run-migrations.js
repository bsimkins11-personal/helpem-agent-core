/**
 * Run Prisma migrations
 * This script runs migrations on server startup to ensure database is up to date
 */

import { prisma } from "./lib/prisma.js";

export async function runMigrations() {
  try {
    console.log("🔄 Running database migrations...");
    
    // Use Prisma's migrate deploy which is safe for production
    // It only runs pending migrations
    const { execSync } = await import("child_process");
    execSync("npx prisma migrate deploy", { 
      stdio: "inherit",
      env: { ...process.env }
    });
    
    console.log("✅ Migrations completed successfully");
    return true;
  } catch (error) {
    // If migrations fail, log but don't crash
    // This allows the app to start even if migrations have issues
    console.error("⚠️ Migration warning:", error.message);
    console.log("📝 Continuing startup - migrations may need manual attention");
    return false;
  }
}
