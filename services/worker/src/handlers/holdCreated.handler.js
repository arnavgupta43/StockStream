import { getDb } from "../lib/db.js";

export async function handleHoldCreated(payload) {
  const db = getDb();
  const { event_id, hold_id, sku, qty, user_id, expires_at, idempotency_key } =
    payload;
  await db.query("BEGIN");
  try {
    await db.query(
      `INSERT INTO processed_events(event_id,event_type) VALUES($1,'HOLD_CREATED') on conflict (event_id) do nothing`,
      [event_id],
    );
    await db.query(
      `INSERT INTO holds(hold_id, sku, qty, user_id, status, expires_at, idempotency_key)
   VALUES ($1,$2,$3,$4,'ACTIVE',$5,$6)
   ON CONFLICT (idempotency_key) DO NOTHING`,
      [hold_id, sku, qty, user_id, expires_at, idempotency_key],
    );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
