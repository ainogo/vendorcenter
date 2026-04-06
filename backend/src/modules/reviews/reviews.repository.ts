import { pool } from "../../db/pool.js";

export async function createReview(input: {
  bookingId: string;
  customerId: string;
  vendorId: string;
  rating: number;
  reviewText?: string;
  mediaUrls: string[];
}) {
  const result = await pool.query(
    `INSERT INTO reviews (booking_id, customer_id, vendor_id, rating, review_text, media_urls)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, booking_id as "bookingId", customer_id as "customerId", vendor_id as "vendorId", rating, review_text as "reviewText", media_urls as "mediaUrls", created_at as "createdAt"`,
    [input.bookingId, input.customerId, input.vendorId, input.rating, input.reviewText ?? null, JSON.stringify(input.mediaUrls)]
  );
  return result.rows[0];
}

export async function bookingForReview(bookingId: string) {
  const result = await pool.query<{ id: string; customerId: string; vendorId: string; status: string }>(
    `SELECT id, customer_id as "customerId", vendor_id as "vendorId", status
     FROM bookings WHERE id = $1 LIMIT 1`,
    [bookingId]
  );
  return result.rows[0] ?? null;
}

export async function refreshVendorRatingAggregate(vendorId: string) {
  await pool.query(
    `INSERT INTO vendor_rating_aggregates (vendor_id, total_reviews, average_rating, updated_at)
     SELECT $1, COUNT(*), COALESCE(AVG(rating), 0), NOW()
     FROM reviews WHERE vendor_id = $1
     ON CONFLICT (vendor_id)
     DO UPDATE SET
       total_reviews = EXCLUDED.total_reviews,
       average_rating = EXCLUDED.average_rating,
       updated_at = NOW()`,
    [vendorId]
  );
}

export async function getVendorRating(vendorId: string) {
  const result = await pool.query<{ totalReviews: number; averageRating: string }>(
    `SELECT total_reviews as "totalReviews", average_rating::text as "averageRating"
     FROM vendor_rating_aggregates WHERE vendor_id = $1 LIMIT 1`,
    [vendorId]
  );
  return result.rows[0] ?? { totalReviews: 0, averageRating: "0" };
}

export async function getReviewedBookingIds(customerId: string): Promise<string[]> {
  const result = await pool.query<{ bookingId: string }>(
    `SELECT booking_id as "bookingId" FROM reviews WHERE customer_id = $1`,
    [customerId]
  );
  return result.rows.map(r => r.bookingId);
}

export async function listRecentPublicReviews(limit = 6, vendorId?: string) {
  const params: (number | string)[] = [limit];
  let vendorFilter = '';
  if (vendorId) {
    vendorFilter = ' AND r.vendor_id = $2';
    params.push(vendorId);
  }

  const result = await pool.query<{
    id: string;
    reviewText: string | null;
    rating: number;
    createdAt: string;
    customerName: string | null;
    serviceName: string | null;
  }>(
    `SELECT
      r.id,
      r.review_text as "reviewText",
      r.rating,
      r.created_at as "createdAt",
      u.name as "customerName",
      b.service_name as "serviceName"
     FROM reviews r
     LEFT JOIN users u ON u.id::text = r.customer_id
     LEFT JOIN bookings b ON b.id = r.booking_id
     WHERE r.review_text IS NOT NULL
       AND length(trim(r.review_text)) > 0${vendorFilter}
     ORDER BY r.created_at DESC
     LIMIT $1`,
    params
  );

  return result.rows;
}
