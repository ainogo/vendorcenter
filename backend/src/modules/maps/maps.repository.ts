import { pool } from "../../db/pool.js";

export async function nearbyVendors(lat: number, lng: number, radiusKm: number) {
  const result = await pool.query(
    `SELECT * FROM (
      SELECT
        vendor_id as "vendorId",
        business_name as "businessName",
        zone,
        latitude,
        longitude,
        service_radius_km as "serviceRadiusKm",
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )) as "distanceKm"
      FROM vendor_profiles
      WHERE verification_status IN ('under_review', 'approved')
    ) t
    WHERE t."distanceKm" <= $3
    ORDER BY t."distanceKm" ASC`,
    [lat, lng, radiusKm]
  );
  return result.rows;
}
