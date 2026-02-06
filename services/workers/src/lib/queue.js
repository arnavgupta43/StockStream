import pg from "pg";
let pool;
export async function initDB() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  pool = new pg.Pool({
    connectionString: url,
  });
}
export function getDB() {
  if (!pool) {
    throw new Error("Database not initialized");
  }
  return pool;
}
