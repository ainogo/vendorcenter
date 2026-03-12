import { pool } from "../../db/pool.js";

export interface ServiceInput {
  vendorId: string;
  name: string;
  price: number;
  availability: "available" | "unavailable";
  locations: string[];
  images: string[];
}

export async function createService(input: ServiceInput) {
  const result = await pool.query(
    `INSERT INTO vendor_services (vendor_id, name, price, availability, locations, images)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
     RETURNING id, vendor_id as "vendorId", name, price, availability, locations, images, created_at as "createdAt", updated_at as "updatedAt"`,
    [input.vendorId, input.name, input.price, input.availability, JSON.stringify(input.locations), JSON.stringify(input.images)]
  );
  return result.rows[0];
}

export async function listServices() {
  const result = await pool.query(
    `SELECT id, vendor_id as "vendorId", name, price, availability, locations, images, created_at as "createdAt", updated_at as "updatedAt"
     FROM vendor_services ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function listServicesByVendor(vendorId: string) {
  const result = await pool.query(
    `SELECT id, vendor_id as "vendorId", name, price, availability, locations, images, created_at as "createdAt", updated_at as "updatedAt"
     FROM vendor_services WHERE vendor_id = $1 ORDER BY created_at DESC`,
    [vendorId]
  );
  return result.rows;
}
