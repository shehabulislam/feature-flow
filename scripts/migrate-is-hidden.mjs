// Run: node scripts/migrate-is-hidden.mjs
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    // Check if column already exists
    const check = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Feedback' AND column_name = 'isHidden'
    `);
    
    if (check.rows.length > 0) {
      console.log("✅ Column 'isHidden' already exists in Feedback table.");
      return;
    }

    await client.query(`ALTER TABLE "Feedback" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false`);
    console.log("✅ Successfully added 'isHidden' column to Feedback table.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
