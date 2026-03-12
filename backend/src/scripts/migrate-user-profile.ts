import { pool } from "../db/pool.js";

async function migrate() {
  console.log("Adding name, phone, business_name columns to users table...");
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name TEXT;
  `);
  console.log("  ✓ users: added name, phone, business_name columns");
  await pool.end();
  console.log("Migration complete.");
}

migrate().catch((err) => { console.error(err); process.exit(1); });
