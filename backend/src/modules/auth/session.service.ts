import { pool } from "../../db/pool.js";

export async function findActiveSessionByTokenHash(refreshTokenHash: string) {
  const result = await pool.query<{ id: string; userId: string }>(
    `SELECT id, user_id as "userId"
     FROM auth_sessions
     WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [refreshTokenHash]
  );
  return result.rows[0] ?? null;
}

export async function revokeSessionById(sessionId: string) {
  await pool.query("UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1", [sessionId]);
}
