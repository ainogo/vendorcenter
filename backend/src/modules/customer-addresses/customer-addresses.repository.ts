import { pool } from "../../db/pool.js";

export interface DbCustomerAddress {
  id: string;
  customerId: string;
  label: string;
  fullAddress: string;
  landmark: string | null;
  pincode: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const SELECT_COLS = `id, customer_id AS "customerId", label, full_address AS "fullAddress", landmark, pincode, city, state, latitude, longitude, is_default AS "isDefault", created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function listAddresses(customerId: string) {
  const r = await pool.query<DbCustomerAddress>(
    `SELECT ${SELECT_COLS} FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC`,
    [customerId]
  );
  return r.rows;
}

export async function getAddress(addressId: string, customerId: string) {
  const r = await pool.query<DbCustomerAddress>(
    `SELECT ${SELECT_COLS} FROM customer_addresses WHERE id = $1 AND customer_id = $2`,
    [addressId, customerId]
  );
  return r.rows[0] ?? null;
}

export async function createAddress(customerId: string, input: {
  label: string; fullAddress: string; landmark?: string; pincode: string;
  city?: string; state?: string; latitude?: number; longitude?: number; isDefault?: boolean;
}) {
  // Enforce max 10
  const countR = await pool.query("SELECT COUNT(*)::int AS c FROM customer_addresses WHERE customer_id = $1", [customerId]);
  if (countR.rows[0].c >= 10) {
    throw new Error("MAX_ADDRESSES");
  }

  // If this is default or first address, unset previous default
  if (input.isDefault || countR.rows[0].c === 0) {
    await pool.query("UPDATE customer_addresses SET is_default = false WHERE customer_id = $1", [customerId]);
  }

  const isDefault = input.isDefault || countR.rows[0].c === 0;

  const r = await pool.query<DbCustomerAddress>(
    `INSERT INTO customer_addresses (customer_id, label, full_address, landmark, pincode, city, state, latitude, longitude, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${SELECT_COLS}`,
    [customerId, input.label, input.fullAddress, input.landmark || null, input.pincode,
     input.city || null, input.state || null, input.latitude || null, input.longitude || null, isDefault]
  );
  return r.rows[0];
}

export async function updateAddress(addressId: string, customerId: string, input: {
  label?: string; fullAddress?: string; landmark?: string; pincode?: string;
  city?: string; state?: string; latitude?: number; longitude?: number;
}) {
  const existing = await getAddress(addressId, customerId);
  if (!existing) return null;

  const r = await pool.query<DbCustomerAddress>(
    `UPDATE customer_addresses SET
       label = COALESCE($3, label),
       full_address = COALESCE($4, full_address),
       landmark = COALESCE($5, landmark),
       pincode = COALESCE($6, pincode),
       city = COALESCE($7, city),
       state = COALESCE($8, state),
       latitude = COALESCE($9, latitude),
       longitude = COALESCE($10, longitude),
       updated_at = NOW()
     WHERE id = $1 AND customer_id = $2
     RETURNING ${SELECT_COLS}`,
    [addressId, customerId, input.label, input.fullAddress, input.landmark,
     input.pincode, input.city, input.state, input.latitude, input.longitude]
  );
  return r.rows[0] ?? null;
}

export async function deleteAddress(addressId: string, customerId: string) {
  const r = await pool.query(
    "DELETE FROM customer_addresses WHERE id = $1 AND customer_id = $2 RETURNING id",
    [addressId, customerId]
  );
  return (r.rowCount ?? 0) > 0;
}

export async function setDefaultAddress(addressId: string, customerId: string) {
  await pool.query("UPDATE customer_addresses SET is_default = false WHERE customer_id = $1", [customerId]);
  const r = await pool.query<DbCustomerAddress>(
    `UPDATE customer_addresses SET is_default = true, updated_at = NOW() WHERE id = $1 AND customer_id = $2
     RETURNING ${SELECT_COLS}`,
    [addressId, customerId]
  );
  return r.rows[0] ?? null;
}
