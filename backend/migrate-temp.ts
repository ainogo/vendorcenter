import { pool } from './src/db/pool.js';

async function migrate() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
    ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS portfolio_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scheduled_date TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;
  `);
  console.log('Migration done');
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
