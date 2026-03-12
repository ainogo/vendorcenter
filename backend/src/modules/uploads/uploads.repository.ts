import { pool } from "../../db/pool.js";

export async function createMediaAsset(input: {
  ownerId: string;
  ownerRole: string;
  mediaType: "profile_picture" | "service_image" | "portfolio_image" | "document";
  url: string;
  metadata?: Record<string, unknown>;
}) {
  const result = await pool.query(
    `INSERT INTO media_assets (owner_id, owner_role, media_type, url, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, owner_id as "ownerId", owner_role as "ownerRole", media_type as "mediaType", url, metadata, created_at as "createdAt"`,
    [input.ownerId, input.ownerRole, input.mediaType, input.url, input.metadata ?? null]
  );
  return result.rows[0];
}

export async function listMediaAssets(ownerId: string) {
  const result = await pool.query(
    `SELECT id, owner_id as "ownerId", owner_role as "ownerRole", media_type as "mediaType", url, metadata, created_at as "createdAt"
     FROM media_assets WHERE owner_id = $1 ORDER BY created_at DESC`,
    [ownerId]
  );
  return result.rows;
}
