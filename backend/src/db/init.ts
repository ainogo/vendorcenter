import { readFileSync } from "node:fs";
import path from "node:path";
import { pool } from "./pool.js";

export async function initializeDatabase() {
  const schemaPath = process.cwd().endsWith("backend")
    ? path.resolve(process.cwd(), "..", "database", "schema.sql")
    : path.resolve(process.cwd(), "database", "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");
  await pool.query(sql);
}
