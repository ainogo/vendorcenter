import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pool } from "./pool.js";

// Lightweight migrations — add missing columns that were introduced after initial schema
const MIGRATIONS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completion_requested_at TIMESTAMPTZ`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_request_token_hash TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_request_expires TIMESTAMPTZ`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rejection_reason TEXT`,
  `ALTER TABLE vendor_services ADD COLUMN IF NOT EXISTS pending_price NUMERIC(12,2)`,
  `ALTER TABLE vendor_services ADD COLUMN IF NOT EXISTS pending_price_effective_at TIMESTAMPTZ`,
  `ALTER TABLE vendor_services ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE vendor_services ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
  `ALTER TABLE vendor_services ADD COLUMN IF NOT EXISTS deleted_reason TEXT`,
  `CREATE TABLE IF NOT EXISTS vendor_service_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL,
    vendor_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('price_update_scheduled', 'price_update_applied', 'deleted')),
    old_price NUMERIC(12,2),
    new_price NUMERIC(12,2),
    effective_at TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  // Phase 0+1: pgvector + AI query logging + embedding tables
  `CREATE EXTENSION IF NOT EXISTS vector`,
  `CREATE TABLE IF NOT EXISTS ai_query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id TEXT,
    user_message TEXT NOT NULL,
    detected_intent TEXT,
    detected_service TEXT,
    detected_action TEXT,
    provider TEXT,
    response_message TEXT,
    response_json JSONB,
    confidence DOUBLE PRECISION,
    latency_ms INTEGER,
    lang TEXT,
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS service_category_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT UNIQUE NOT NULL,
    keywords TEXT,
    description TEXT,
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS faq_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    embedding vector(384),
    lang TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS embedding vector(384)`,
  `ALTER TABLE vendor_services ADD COLUMN IF NOT EXISTS embedding vector(384)`,
  // RLS: enable on all tables (backend connects as postgres superuser, bypasses RLS;
  // this blocks Supabase anon/authenticated roles from direct table access)
  `ALTER TABLE users ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE otp_events ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE bookings ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE zones ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE vendor_services ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE vendor_service_history ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE employee_zone_assignments ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE reviews ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE vendor_rating_aggregates ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE email_jobs ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE employee_support_tasks ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE ai_query_logs ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE service_category_embeddings ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE faq_embeddings ENABLE ROW LEVEL SECURITY`,
  // Phone auth: make email/password nullable, add Firebase columns
  `ALTER TABLE users ALTER COLUMN email DROP NOT NULL`,
  `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid) WHERE firebase_uid IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL`,
  // Multi-role support
  `CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'vendor', 'admin', 'employee')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
  )`,
  `INSERT INTO user_roles (user_id, role) SELECT id, role FROM users ON CONFLICT (user_id, role) DO NOTHING`,
  // Device tokens for push notifications (FCM)
  `CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, token)
  )`,
  // OTP phone channel support
  `ALTER TABLE otp_events ADD COLUMN IF NOT EXISTS phone TEXT`,
  `ALTER TABLE otp_events ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email'`,
  `ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY`,
  // Admin: suspended column and employee permissions
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS employee_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, permission)
  )`,
  `ALTER TABLE employee_permissions ENABLE ROW LEVEL SECURITY`,
  // Fix unique constraints: phone and email must be unique per-role, not globally
  // Drop global phone unique (allows same phone across customer/vendor roles)
  `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_unique`,
  // Drop global email unique (allows same email across customer/vendor roles)
  `DROP INDEX IF EXISTS users_email_key`,
  `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`,
  // Drop global firebase_uid unique (allows same Firebase user across roles)
  `DROP INDEX IF EXISTS idx_users_firebase_uid`,
  `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_firebase_uid_key`,
  // Create per-role unique indexes
  `CREATE UNIQUE INDEX IF NOT EXISTS users_phone_role_unique ON users (phone, role) WHERE phone IS NOT NULL AND phone != ''`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_role_unique ON users (email, role) WHERE email IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_role_unique ON users (firebase_uid, role) WHERE firebase_uid IS NOT NULL`,
  // Zones: add pincode column for pincode-level granularity
  `ALTER TABLE zones ADD COLUMN IF NOT EXISTS pincode TEXT`,
  // === Hierarchical Service Zones (Phase 1) ===
  `CREATE TABLE IF NOT EXISTS service_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'India',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, country)
  )`,
  `CREATE TABLE IF NOT EXISTS service_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES service_states(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(state_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES service_zones(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(zone_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS service_pincodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID NOT NULL REFERENCES service_areas(id) ON DELETE CASCADE,
    pincode CHAR(6) NOT NULL UNIQUE,
    locality_name TEXT,
    district TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS vendor_service_pincodes (
    vendor_id TEXT NOT NULL,
    pincode_id UUID NOT NULL REFERENCES service_pincodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (vendor_id, pincode_id)
  )`,
  `CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT 'Home',
    full_address TEXT NOT NULL,
    landmark TEXT,
    pincode CHAR(6) NOT NULL,
    city TEXT,
    state TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_service_pincodes_area ON service_pincodes(area_id)`,
  `CREATE INDEX IF NOT EXISTS idx_service_pincodes_pincode ON service_pincodes(pincode)`,
  `CREATE INDEX IF NOT EXISTS idx_vendor_service_pincodes_vendor ON vendor_service_pincodes(vendor_id)`,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS primary_pincode CHAR(6)`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_address_id UUID`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_pincode CHAR(6)`,
  `ALTER TABLE service_states ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE service_zones ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE service_pincodes ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE vendor_service_pincodes ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY`,
];

export async function initializeDatabase() {
  // Try multiple possible schema paths (monorepo root vs Docker container)
  const possiblePaths = [
    path.resolve(process.cwd(), "src", "db", "schema.sql"),
    path.resolve(process.cwd(), "database", "schema.sql"),
    path.resolve(process.cwd(), "..", "database", "schema.sql"),
    path.resolve(process.cwd(), "..", "backend", "src", "db", "schema.sql"),
  ];

  const schemaPath = possiblePaths.find((p) => existsSync(p));

  if (!schemaPath) {
    console.log("[db] schema.sql not found — skipping table creation (tables should already exist)");
    // Verify connection still works
    await pool.query("SELECT 1");
  } else {
    let sql = readFileSync(schemaPath, "utf8");
    // Strip pgvector extension line — it's handled in MIGRATIONS with try/catch
    sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS\s+"?vector"?\s*;/gi, "-- vector extension handled in migrations");

    // Check if pgvector is available BEFORE running schema
    let hasVector = false;
    try {
      const extCheck = await pool.query("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
      hasVector = extCheck.rowCount! > 0;
    } catch {
      // pg_extension query failed — assume no vector
    }

    if (!hasVector) {
      // Strip vector column definitions so schema doesn't fail on local dev
      sql = sql.replace(/,?\s*embedding\s+vector\(\d+\)/g, "");
    }

    try {
      await pool.query(sql);
    } catch (schemaErr) {
      console.warn(`[db] schema.sql failed, starting in degraded mode: ${(schemaErr as Error).message}`);
    }
  }

  // Run lightweight migrations
  for (const migration of MIGRATIONS) {
    try {
      await pool.query(migration);
    } catch (err) {
      console.warn(`[db] migration skipped: ${(err as Error).message}`);
    }
  }
  console.log("[db] migrations applied");
}
