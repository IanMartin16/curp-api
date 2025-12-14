import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL (Railway Postgres)");
}

const ssl =
  process.env.PGSSLMODE === "disable"
    ? false
    : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString,
  ssl,
  max: 10, // conexiones máximas
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  console.error("PG Pool error:", err);
});
   