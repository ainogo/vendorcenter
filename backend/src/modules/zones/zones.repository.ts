import { pool } from "../../db/pool.js";

export interface DbZone {
  id: string;
  country: string;
  state: string;
  city: string;
  zone: string;
  pincode: string | null;
  active: boolean;
  createdAt: string;
}

export async function listZones() {
  const result = await pool.query<DbZone>(
    `SELECT id, country, state, city, zone, pincode, active, created_at as "createdAt"
     FROM zones ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function createZone(input: { country: string; state: string; city: string; zone: string; pincode?: string }) {
  const result = await pool.query<DbZone>(
    `INSERT INTO zones (country, state, city, zone, pincode)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, country, state, city, zone, pincode, active, created_at as "createdAt"`,
    [input.country, input.state, input.city, input.zone, input.pincode || null]
  );
  return result.rows[0];
}

export async function toggleZoneActive(id: string) {
  const result = await pool.query<DbZone>(
    `UPDATE zones SET active = NOT active WHERE id = $1
     RETURNING id, country, state, city, zone, pincode, active, created_at as "createdAt"`,
    [id]
  );
  return result.rows[0];
}

export async function countZones() {
  const result = await pool.query<{ total: string }>("SELECT COUNT(*)::text as total FROM zones WHERE active = true");
  return Number(result.rows[0]?.total ?? "0");
}

export async function countActiveCities() {
  const result = await pool.query<{ total: string }>(
    "SELECT COUNT(DISTINCT LOWER(city))::text as total FROM zones WHERE active = true"
  );
  return Number(result.rows[0]?.total ?? "0");
}
