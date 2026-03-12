import { pool } from "../../db/pool.js";

export interface DbZone {
  id: string;
  country: string;
  state: string;
  city: string;
  zone: string;
  createdAt: string;
}

export async function listZones() {
  const result = await pool.query<DbZone>(
    `SELECT id, country, state, city, zone, created_at as "createdAt"
     FROM zones ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function createZone(input: { country: string; state: string; city: string; zone: string }) {
  const result = await pool.query<DbZone>(
    `INSERT INTO zones (country, state, city, zone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, country, state, city, zone, created_at as "createdAt"`,
    [input.country, input.state, input.city, input.zone]
  );
  return result.rows[0];
}

export async function countZones() {
  const result = await pool.query<{ total: string }>("SELECT COUNT(*)::text as total FROM zones");
  return Number(result.rows[0]?.total ?? "0");
}
