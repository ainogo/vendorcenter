import { pool } from "../db/pool.js";

async function run() {
  await pool.query("ALTER TABLE otp_events DROP CONSTRAINT IF EXISTS otp_events_purpose_check");
  await pool.query(
    "ALTER TABLE otp_events ADD CONSTRAINT otp_events_purpose_check CHECK (purpose IN ('signup', 'vendor_onboarding', 'password_reset', 'employee_login', 'login'))"
  );
  console.log("Migration done: 'login' purpose added to otp_events CHECK constraint");
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
