import pg from "pg";

let pool;
export async function initDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  pool = new pg.Pool({ connectionString: url });
  await pool.query("SELECT 1");
  console.log("[worker] postgres connected");
}

export function getDb() {
  if (!pool) throw new Error("DB not initialized");
  return pool;
}
