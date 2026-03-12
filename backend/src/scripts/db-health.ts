import dotenv from "dotenv";
import { pool } from "../db/pool.js";

dotenv.config({ path: process.env.ENV_FILE ?? ".env", override: true });

type Row = {
  now: string;
  db: string;
  current_user: string;
};

async function run() {
  try {
    const result = await pool.query<Row>("SELECT NOW()::text as now, current_database() as db, current_user");
    const row = result.rows[0];
    console.log(JSON.stringify({ success: true, data: row }, null, 2));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DB error";
    console.error(JSON.stringify({ success: false, error: message }, null, 2));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void run();
