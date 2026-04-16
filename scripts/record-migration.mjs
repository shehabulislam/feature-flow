// Run: node scripts/record-migration.mjs
// Records the manual migration in prisma's _prisma_migrations table
import { Pool } from "pg";
import * as dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrationSql = `-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
`;

async function recordMigration() {
  const client = await pool.connect();
  try {
    const migrationName = "20260416075000_add_feedback_is_hidden";
    
    // Check if already recorded
    const check = await client.query(
      `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
      [migrationName]
    );
    
    if (check.rows.length > 0) {
      console.log("✅ Migration already recorded in _prisma_migrations.");
      return;
    }

    const checksum = crypto.createHash("sha256").update(migrationSql).digest("hex");
    
    await client.query(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
      [crypto.randomUUID(), checksum, migrationName]
    );
    
    console.log("✅ Migration recorded in _prisma_migrations.");
  } catch (err) {
    console.error("❌ Failed to record migration:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

recordMigration();
