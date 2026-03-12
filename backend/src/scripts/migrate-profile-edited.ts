import { pool } from "../db/pool.js";

async function migrate() {
  console.log("Adding profile_edited column to vendor_profiles...");
  await pool.query(`
    ALTER TABLE vendor_profiles
    ADD COLUMN IF NOT EXISTS profile_edited BOOLEAN NOT NULL DEFAULT false
  `);
  console.log("Migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
