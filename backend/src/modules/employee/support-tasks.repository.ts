import { pool } from "../../db/pool.js";

export async function createSupportTask(input: {
  title: string;
  description?: string;
  zone?: string;
  assignedTo: string;
  assignedBy: string;
  priority: "low" | "medium" | "high" | "critical";
}) {
  const result = await pool.query(
    `INSERT INTO employee_support_tasks (title, description, zone, assigned_to, assigned_by, priority)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, title, description, zone, assigned_to as "assignedTo", assigned_by as "assignedBy", status, priority, created_at as "createdAt", updated_at as "updatedAt"`,
    [input.title, input.description ?? null, input.zone ?? null, input.assignedTo, input.assignedBy, input.priority]
  );
  return result.rows[0];
}

export async function listSupportTasksByAssignee(assigneeId: string) {
  const result = await pool.query(
    `SELECT id, title, description, zone, assigned_to as "assignedTo", assigned_by as "assignedBy", status, priority, created_at as "createdAt", updated_at as "updatedAt"
     FROM employee_support_tasks WHERE assigned_to = $1 ORDER BY created_at DESC`,
    [assigneeId]
  );
  return result.rows;
}

export async function listAllSupportTasks() {
  const result = await pool.query(
    `SELECT id, title, description, zone, assigned_to as "assignedTo", assigned_by as "assignedBy", status, priority, created_at as "createdAt", updated_at as "updatedAt"
     FROM employee_support_tasks ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function updateSupportTaskStatus(taskId: string, status: "open" | "in_progress" | "resolved" | "closed") {
  const result = await pool.query(
    `UPDATE employee_support_tasks
     SET status = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, description, zone, assigned_to as "assignedTo", assigned_by as "assignedBy", status, priority, created_at as "createdAt", updated_at as "updatedAt"`,
    [taskId, status]
  );
  return result.rows[0] ?? null;
}
