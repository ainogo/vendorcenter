import { pool } from "../db/pool.js";

/**
 * Run this migration to:
 * 1. Add polygon_coordinates and active columns to zones table
 * 2. Add indexes on vendor_profiles(latitude, longitude) for geo queries
 * 3. Add rating columns joined from vendor_rating_aggregates for nearby queries
 */
async function run() {
  console.log("Running location schema migration...");

  // 1. Add polygon support to zones
  await pool.query(`
    ALTER TABLE zones
    ADD COLUMN IF NOT EXISTS polygon_coordinates JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true
  `);
  console.log("  ✓ zones: added polygon_coordinates, active");

  // 2. Add indexes for geo queries on vendor_profiles
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_profiles_lat ON vendor_profiles (latitude);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_profiles_lng ON vendor_profiles (longitude);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_profiles_lat_lng ON vendor_profiles (latitude, longitude);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_profiles_verification ON vendor_profiles (verification_status);
  `);
  console.log("  ✓ vendor_profiles: added lat/lng/verification indexes");

  // 3. Add index on zones.active for filtered queries
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_zones_active ON zones (active);
  `);
  console.log("  ✓ zones: added active index");

  console.log("Migration complete.");
  await pool.end();
}

run().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
