import { nanoid } from "nanoid";
import { pool } from "../../db/pool.js";
import { db } from "../../shared/store.js";
import { AppRole } from "../../shared/types.js";

export function trackActivity(input: {
  actorId: string;
  role: AppRole;
  action: string;
  entity: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}) {
  db.activities.push({
    id: nanoid(),
    actorId: input.actorId,
    role: input.role,
    action: input.action,
    entity: input.entity,
    metadata: input.metadata,
    createdAt: Date.now()
  });

  void pool.query(
    "INSERT INTO activity_logs (actor_id, role, action, entity, request_id, metadata) VALUES ($1, $2, $3, $4, $5, $6)",
    [input.actorId, input.role, input.action, input.entity, input.requestId ?? null, input.metadata ?? null]
  );
}

export async function listActivities(input?: { limit?: number; requestId?: string; actorId?: string; action?: string }) {
  const limit = input?.limit ?? 100;
  const where: string[] = [];
  const params: unknown[] = [];

  if (input?.requestId) {
    params.push(input.requestId);
    where.push(`request_id = $${params.length}`);
  }

  if (input?.actorId) {
    params.push(input.actorId);
    where.push(`actor_id = $${params.length}`);
  }

  if (input?.action) {
    params.push(input.action);
    where.push(`action = $${params.length}`);
  }

  params.push(limit);
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const result = await pool.query(
    `SELECT id, actor_id as "actorId", role, action, entity, request_id as "requestId", metadata, created_at as "createdAt"
     FROM activity_logs ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  return result.rows;
}
