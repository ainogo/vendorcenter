import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: process.env.ENV_FILE ?? ".env", override: true });

const host = process.env.DB_HOST ?? "localhost";
const port = Number(process.env.DB_PORT ?? 5432);
const user = process.env.DB_USER ?? "postgres";
const password = process.env.DB_PASSWORD ?? "";
const targetDb = process.env.DB_NAME ?? "vendorcenter";

async function bootstrap() {
  const client = new Client({
    host,
    port,
    user,
    password,
    database: "postgres"
  });

  await client.connect();

  const exists = await client.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) as exists",
    [targetDb]
  );

  if (!exists.rows[0]?.exists) {
    const safeDbName = targetDb.replace(/[^a-zA-Z0-9_]/g, "");
    await client.query(`CREATE DATABASE ${safeDbName}`);
    console.log(JSON.stringify({ success: true, message: `Database ${safeDbName} created` }, null, 2));
  } else {
    console.log(JSON.stringify({ success: true, message: `Database ${targetDb} already exists` }, null, 2));
  }

  await client.end();
}

bootstrap().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown bootstrap error";
  console.error(JSON.stringify({ success: false, error: message }, null, 2));
  process.exit(1);
});
