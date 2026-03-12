import { pool } from "../../db/pool.js";

export async function replaceEmployeeZones(employeeId: string, zones: string[]) {
  await pool.query("DELETE FROM employee_zone_assignments WHERE employee_id = $1", [employeeId]);
  for (const zone of zones) {
    await pool.query("INSERT INTO employee_zone_assignments (employee_id, zone) VALUES ($1, $2)", [employeeId, zone]);
  }
}

export async function listEmployeeZones(employeeId: string) {
  const result = await pool.query<{ zone: string }>(
    "SELECT zone FROM employee_zone_assignments WHERE employee_id = $1 ORDER BY created_at DESC",
    [employeeId]
  );
  return result.rows.map((r) => r.zone);
}
