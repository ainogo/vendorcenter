import { pool } from "../../db/pool.js";

export interface UploadFileAccessContext {
  ownerIds: string[];
}

function matchesUrlClause(columnExpression: string) {
  return `(${columnExpression} = $1 OR ${columnExpression} = $2 OR ${columnExpression} = $3 OR ${columnExpression} LIKE $4)`;
}

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

export async function getUploadFileAccessContext(filename: string): Promise<UploadFileAccessContext> {
  const relativePath = `/api/uploads/files/${filename}`;
  const bareFilename = filename;
  const suffixPath = `%/${filename}`;

  const ownerIds = new Set<string>();

  const mediaAssets = await pool.query<{ ownerId: string }>(
    `SELECT DISTINCT owner_id as "ownerId"
     FROM media_assets
     WHERE ${matchesUrlClause("url")}`,
    [relativePath, bareFilename, filename, suffixPath]
  );
  mediaAssets.rows.forEach((row) => ownerIds.add(row.ownerId));

  const userOwners = await pool.query<{ ownerId: string }>(
    `SELECT DISTINCT id as "ownerId"
     FROM users
     WHERE ${matchesUrlClause("profile_picture_url")}`,
    [relativePath, bareFilename, filename, suffixPath]
  );
  userOwners.rows.forEach((row) => ownerIds.add(row.ownerId));

  const vendorProfileOwners = await pool.query<{ ownerId: string }>(
    `SELECT DISTINCT vendor_id as "ownerId"
     FROM vendor_profiles vp
     WHERE EXISTS (
       SELECT 1
       FROM jsonb_array_elements_text(vp.document_urls) AS d(url)
       WHERE ${matchesUrlClause("d.url")}
     )
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements_text(vp.portfolio_urls) AS p(url)
       WHERE ${matchesUrlClause("p.url")}
     )`,
    [relativePath, bareFilename, filename, suffixPath]
  );
  vendorProfileOwners.rows.forEach((row) => ownerIds.add(row.ownerId));

  const vendorServiceOwners = await pool.query<{ ownerId: string }>(
    `SELECT DISTINCT vendor_id as "ownerId"
     FROM vendor_services vs
     WHERE EXISTS (
       SELECT 1
       FROM jsonb_array_elements_text(vs.images) AS i(url)
       WHERE ${matchesUrlClause("i.url")}
     )`,
    [relativePath, bareFilename, filename, suffixPath]
  );
  vendorServiceOwners.rows.forEach((row) => ownerIds.add(row.ownerId));

  const reviewOwners = await pool.query<{ ownerId: string }>(
    `SELECT DISTINCT customer_id as "ownerId"
     FROM reviews r
     WHERE EXISTS (
       SELECT 1
       FROM jsonb_array_elements_text(r.media_urls) AS m(url)
       WHERE ${matchesUrlClause("m.url")}
     )`,
    [relativePath, bareFilename, filename, suffixPath]
  );
  reviewOwners.rows.forEach((row) => ownerIds.add(row.ownerId));

  return {
    ownerIds: Array.from(ownerIds),
  };
}
