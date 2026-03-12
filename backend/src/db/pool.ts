import { Pool } from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env"), override: true });

const isProduction = process.env.NODE_ENV === "production";

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME ?? "vendorcenter",
      user: process.env.DB_USER ?? "vendorcenter",
      password: process.env.DB_PASSWORD ?? "change_me",
      ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {}),
    });
