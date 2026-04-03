/**
 * Seed an admin user into the database.
 * Usage: npx tsx src/scripts/seed-admin.ts
 *
 * Default credentials (change in production):
 *   Email:    admin@vendorcenter.in
 *   Password: Admin@1234
 */
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@vendorcenter.in";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD env var is required. Do not use hardcoded passwords.");
  process.exit(1);
}

async function seedAdmin() {
  const existing = await pool.query(
    "SELECT id, email FROM users WHERE email = $1",
    [ADMIN_EMAIL]
  );

  if (existing.rows.length > 0) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL} (id: ${existing.rows[0].id})`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD!, 12);
  const result = await pool.query(
    `INSERT INTO users (email, role, password_hash, name, verified)
     VALUES ($1, 'admin', $2, 'Platform Admin', true)
     RETURNING id, email, role`,
    [ADMIN_EMAIL, passwordHash]
  );

  console.log(`Admin user created successfully:`);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  ID:       ${result.rows[0].id}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Failed to seed admin:", err.message);
  process.exit(1);
});
