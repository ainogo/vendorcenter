import { pool } from "../../db/pool.js";

// ── Types ──────────────────────────────────────────────────────

export interface DbServiceState {
  id: string;
  name: string;
  country: string;
  active: boolean;
  createdAt: string;
  zoneCount?: number;
}

export interface DbServiceZone {
  id: string;
  stateId: string;
  stateName?: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  areaCount?: number;
}

export interface DbServiceArea {
  id: string;
  zoneId: string;
  zoneName?: string;
  name: string;
  active: boolean;
  createdAt: string;
  pincodeCount?: number;
}

export interface DbServicePincode {
  id: string;
  areaId: string;
  areaName?: string;
  zoneName?: string;
  stateName?: string;
  pincode: string;
  localityName: string | null;
  district: string | null;
  active: boolean;
  createdAt: string;
}

// ── States ─────────────────────────────────────────────────────

export async function listStates() {
  const r = await pool.query<DbServiceState>(
    `SELECT s.id, s.name, s.country, s.active, s.created_at AS "createdAt",
            (SELECT COUNT(*)::int FROM service_zones z WHERE z.state_id = s.id) AS "zoneCount"
     FROM service_states s ORDER BY s.name`
  );
  return r.rows;
}

export async function createState(name: string, country = "India") {
  // Title-case the name for consistency (e.g. "maharashtra" → "Maharashtra")
  const normalized = name.trim().replace(/\b\w/g, c => c.toUpperCase()).replace(/\b(And|Of|The)\b/g, w => w.toLowerCase());
  // First check if a state with this name already exists (case-insensitive)
  const existing = await pool.query<DbServiceState>(
    `SELECT id, name, country, active, created_at AS "createdAt" FROM service_states WHERE LOWER(name) = LOWER($1) AND LOWER(country) = LOWER($2)`,
    [normalized, country.trim()]
  );
  if (existing.rows.length > 0) return existing.rows[0];
  const r = await pool.query<DbServiceState>(
    `INSERT INTO service_states (name, country) VALUES ($1, $2)
     ON CONFLICT (name, country) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, country, active, created_at AS "createdAt"`,
    [normalized, country.trim()]
  );
  return r.rows[0];
}

export async function toggleStateActive(id: string) {
  const r = await pool.query<DbServiceState>(
    `UPDATE service_states SET active = NOT active WHERE id = $1
     RETURNING id, name, country, active, created_at AS "createdAt"`,
    [id]
  );
  return r.rows[0] ?? null;
}

// ── Zones ──────────────────────────────────────────────────────

export async function listZonesByState(stateId: string) {
  const r = await pool.query<DbServiceZone>(
    `SELECT z.id, z.state_id AS "stateId", s.name AS "stateName", z.name, z.description, z.active, z.created_at AS "createdAt",
            (SELECT COUNT(*)::int FROM service_areas a WHERE a.zone_id = z.id) AS "areaCount"
     FROM service_zones z
     JOIN service_states s ON s.id = z.state_id
     WHERE z.state_id = $1 ORDER BY z.name`,
    [stateId]
  );
  return r.rows;
}

export async function createZone(stateId: string, name: string, description?: string) {
  const r = await pool.query<DbServiceZone>(
    `INSERT INTO service_zones (state_id, name, description) VALUES ($1, $2, $3)
     RETURNING id, state_id AS "stateId", name, description, active, created_at AS "createdAt"`,
    [stateId, name.trim(), description?.trim() || null]
  );
  return r.rows[0];
}

export async function toggleZoneActive(id: string) {
  const r = await pool.query<DbServiceZone>(
    `UPDATE service_zones SET active = NOT active WHERE id = $1
     RETURNING id, state_id AS "stateId", name, description, active, created_at AS "createdAt"`,
    [id]
  );
  return r.rows[0] ?? null;
}

// ── Areas ──────────────────────────────────────────────────────

export async function listAreasByZone(zoneId: string) {
  const r = await pool.query<DbServiceArea>(
    `SELECT a.id, a.zone_id AS "zoneId", z.name AS "zoneName", a.name, a.active, a.created_at AS "createdAt",
            (SELECT COUNT(*)::int FROM service_pincodes p WHERE p.area_id = a.id) AS "pincodeCount"
     FROM service_areas a
     JOIN service_zones z ON z.id = a.zone_id
     WHERE a.zone_id = $1 ORDER BY a.name`,
    [zoneId]
  );
  return r.rows;
}

export async function createArea(zoneId: string, name: string) {
  const r = await pool.query<DbServiceArea>(
    `INSERT INTO service_areas (zone_id, name) VALUES ($1, $2)
     RETURNING id, zone_id AS "zoneId", name, active, created_at AS "createdAt"`,
    [zoneId, name.trim()]
  );
  return r.rows[0];
}

export async function toggleAreaActive(id: string) {
  const r = await pool.query<DbServiceArea>(
    `UPDATE service_areas SET active = NOT active WHERE id = $1
     RETURNING id, zone_id AS "zoneId", name, active, created_at AS "createdAt"`,
    [id]
  );
  return r.rows[0] ?? null;
}

// ── Find-or-Create helpers (for quick-add) ─────────────────────

export async function findOrCreateZone(stateId: string, name: string, description?: string) {
  const existing = await pool.query<DbServiceZone>(
    `SELECT id, state_id AS "stateId", name, description, active, created_at AS "createdAt"
     FROM service_zones WHERE state_id = $1 AND LOWER(name) = LOWER($2)`,
    [stateId, name.trim()]
  );
  if (existing.rows[0]) return existing.rows[0];
  return createZone(stateId, name, description);
}

export async function findOrCreateArea(zoneId: string, name: string) {
  const existing = await pool.query<DbServiceArea>(
    `SELECT id, zone_id AS "zoneId", name, active, created_at AS "createdAt"
     FROM service_areas WHERE zone_id = $1 AND LOWER(name) = LOWER($2)`,
    [zoneId, name.trim()]
  );
  if (existing.rows[0]) return existing.rows[0];
  return createArea(zoneId, name);
}

// ── Pincodes ───────────────────────────────────────────────────

export async function listPincodesByArea(areaId: string) {
  const r = await pool.query<DbServicePincode>(
    `SELECT p.id, p.area_id AS "areaId", a.name AS "areaName", p.pincode, p.locality_name AS "localityName",
            p.district, p.active, p.created_at AS "createdAt"
     FROM service_pincodes p
     JOIN service_areas a ON a.id = p.area_id
     WHERE p.area_id = $1 ORDER BY p.pincode`,
    [areaId]
  );
  return r.rows;
}

export async function createPincode(areaId: string, pincode: string, localityName?: string, district?: string) {
  const r = await pool.query<DbServicePincode>(
    `INSERT INTO service_pincodes (area_id, pincode, locality_name, district) VALUES ($1, $2, $3, $4)
     ON CONFLICT (pincode) DO UPDATE SET area_id = EXCLUDED.area_id, locality_name = EXCLUDED.locality_name, district = EXCLUDED.district
     RETURNING id, area_id AS "areaId", pincode, locality_name AS "localityName", district, active, created_at AS "createdAt"`,
    [areaId, pincode, localityName?.trim() || null, district?.trim() || null]
  );
  return r.rows[0];
}

export async function togglePincodeActive(id: string) {
  const r = await pool.query<DbServicePincode>(
    `UPDATE service_pincodes SET active = NOT active WHERE id = $1
     RETURNING id, area_id AS "areaId", pincode, locality_name AS "localityName", district, active, created_at AS "createdAt"`,
    [id]
  );
  return r.rows[0] ?? null;
}

// ── Serviceability Check ───────────────────────────────────────

export async function checkServiceability(pincode: string) {
  const r = await pool.query(
    `SELECT p.id AS "pincodeId", p.pincode, p.locality_name AS "localityName", p.district, p.active AS "pincodeActive",
            a.id AS "areaId", a.name AS "areaName", a.active AS "areaActive",
            z.id AS "zoneId", z.name AS "zoneName", z.active AS "zoneActive",
            s.id AS "stateId", s.name AS "stateName", s.active AS "stateActive"
     FROM service_pincodes p
     JOIN service_areas a ON a.id = p.area_id
     JOIN service_zones z ON z.id = a.zone_id
     JOIN service_states s ON s.id = z.state_id
     WHERE p.pincode = $1`,
    [pincode]
  );
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  return {
    serviceable: row.pincodeActive && row.areaActive && row.zoneActive && row.stateActive,
    pincode: row.pincode,
    localityName: row.localityName,
    district: row.district,
    area: { id: row.areaId, name: row.areaName },
    zone: { id: row.zoneId, name: row.zoneName },
    state: { id: row.stateId, name: row.stateName },
  };
}

// ── Full Hierarchy (for dropdowns) ─────────────────────────────

export async function getFullHierarchy() {
  const [statesR, zonesR, areasR, pincodesR] = await Promise.all([
    pool.query(`SELECT id, name, country, active FROM service_states WHERE active = true ORDER BY name`),
    pool.query(`SELECT id, state_id AS "stateId", name, description, active FROM service_zones WHERE active = true ORDER BY name`),
    pool.query(`SELECT id, zone_id AS "zoneId", name, active FROM service_areas WHERE active = true ORDER BY name`),
    pool.query(`SELECT id, area_id AS "areaId", pincode, locality_name AS "localityName", district, active FROM service_pincodes WHERE active = true ORDER BY pincode`),
  ]);

  // Build tree
  const pincodesByArea = new Map<string, any[]>();
  for (const p of pincodesR.rows) {
    const list = pincodesByArea.get(p.areaId) || [];
    list.push(p);
    pincodesByArea.set(p.areaId, list);
  }

  const areasByZone = new Map<string, any[]>();
  for (const a of areasR.rows) {
    const enriched = { ...a, pincodes: pincodesByArea.get(a.id) || [] };
    const list = areasByZone.get(a.zoneId) || [];
    list.push(enriched);
    areasByZone.set(a.zoneId, list);
  }

  const zonesByState = new Map<string, any[]>();
  for (const z of zonesR.rows) {
    const enriched = { ...z, areas: areasByZone.get(z.id) || [] };
    const list = zonesByState.get(z.stateId) || [];
    list.push(enriched);
    zonesByState.set(z.stateId, list);
  }

  return statesR.rows.map((s: any) => ({
    ...s,
    zones: zonesByState.get(s.id) || [],
  }));
}

// ── Counts ─────────────────────────────────────────────────────

export async function countActiveStates() {
  const r = await pool.query("SELECT COUNT(*)::int AS c FROM service_states WHERE active = true");
  return r.rows[0].c;
}

export async function countActiveServiceZones() {
  const r = await pool.query("SELECT COUNT(*)::int AS c FROM service_zones WHERE active = true");
  return r.rows[0].c;
}

export async function countActiveServicePincodes() {
  const r = await pool.query("SELECT COUNT(*)::int AS c FROM service_pincodes WHERE active = true");
  return r.rows[0].c;
}

// ── Vendor Pincodes ────────────────────────────────────────────

export async function setVendorServicePincodes(vendorId: string, pincodeIds: string[]) {
  // Replace all vendor's pincodes
  await pool.query("DELETE FROM vendor_service_pincodes WHERE vendor_id = $1", [vendorId]);
  if (pincodeIds.length === 0) return [];

  const values = pincodeIds.map((id, i) => `($1, $${i + 2})`).join(", ");
  await pool.query(
    `INSERT INTO vendor_service_pincodes (vendor_id, pincode_id) VALUES ${values}
     ON CONFLICT DO NOTHING`,
    [vendorId, ...pincodeIds]
  );

  return getVendorServicePincodes(vendorId);
}

export async function getVendorServicePincodes(vendorId: string) {
  const r = await pool.query(
    `SELECT vsp.pincode_id AS "pincodeId", sp.pincode, sp.locality_name AS "localityName", sp.district,
            sa.name AS "areaName", sz.name AS "zoneName", ss.name AS "stateName"
     FROM vendor_service_pincodes vsp
     JOIN service_pincodes sp ON sp.id = vsp.pincode_id
     JOIN service_areas sa ON sa.id = sp.area_id
     JOIN service_zones sz ON sz.id = sa.zone_id
     JOIN service_states ss ON ss.id = sz.state_id
     WHERE vsp.vendor_id = $1
     ORDER BY sp.pincode`,
    [vendorId]
  );
  return r.rows;
}

export async function vendorServesPincode(vendorId: string, pincode: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM vendor_service_pincodes vsp
     JOIN service_pincodes sp ON sp.id = vsp.pincode_id
     WHERE vsp.vendor_id = $1 AND sp.pincode = $2 AND sp.active = true`,
    [vendorId, pincode]
  );
  return (r.rowCount ?? 0) > 0;
}

export async function findVendorsByPincode(pincode: string) {
  const r = await pool.query(
    `SELECT DISTINCT vsp.vendor_id AS "vendorId", vp.business_name AS "businessName",
            vp.service_categories AS "serviceCategories", vp.latitude, vp.longitude,
            vp.working_hours AS "workingHours", vp.verification_status AS "verificationStatus",
            COALESCE(vra.average_rating, 0)::float AS rating,
            COALESCE(vra.total_reviews, 0)::int AS reviews
     FROM vendor_service_pincodes vsp
     JOIN service_pincodes sp ON sp.id = vsp.pincode_id
     JOIN vendor_profiles vp ON vp.vendor_id = vsp.vendor_id
     LEFT JOIN vendor_rating_aggregates vra ON vra.vendor_id = vsp.vendor_id
     WHERE sp.pincode = $1 AND sp.active = true AND vp.verification_status = 'approved'
     ORDER BY rating DESC`,
    [pincode]
  );
  return r.rows;
}

// ── Delete Functions (hard delete — cascades via FK) ───────────

export async function deleteState(id: string) {
  const r = await pool.query("DELETE FROM service_states WHERE id = $1 RETURNING id, name", [id]);
  return r.rows[0] ?? null;
}

export async function deleteZone(id: string) {
  const r = await pool.query("DELETE FROM service_zones WHERE id = $1 RETURNING id, name", [id]);
  return r.rows[0] ?? null;
}

export async function deleteArea(id: string) {
  const r = await pool.query("DELETE FROM service_areas WHERE id = $1 RETURNING id, name", [id]);
  return r.rows[0] ?? null;
}

export async function deletePincode(id: string) {
  const r = await pool.query("DELETE FROM service_pincodes WHERE id = $1 RETURNING id, pincode", [id]);
  return r.rows[0] ?? null;
}

// ── Indian State/UT Validation ─────────────────────────────────

const VALID_INDIAN_STATES = new Set([
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
  "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand",
  "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur",
  "meghalaya", "mizoram", "nagaland", "odisha", "punjab",
  "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura",
  "uttar pradesh", "uttarakhand", "west bengal",
  "andaman and nicobar islands", "chandigarh",
  "dadra and nagar haveli and daman and diu", "daman and diu",
  "dadra and nagar haveli", "delhi", "new delhi",
  "jammu and kashmir", "ladakh", "lakshadweep", "puducherry",
]);

export function isValidIndianState(name: string): boolean {
  return VALID_INDIAN_STATES.has(name.trim().toLowerCase());
}
