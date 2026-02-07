import { getDb } from "../lib/db.js";

export async function handleHoldExpired(payload) {
  const db = getDb();
  const { event_id, hold_id } = payload;

  await db.query("BEGIN");
  try {
    await db.query(
      `INSERT INTO processed_events(event_id, event_type)
       VALUES ($1, 'HOLD_EXPIRED')
       ON CONFLICT (event_id) DO NOTHING`,
      [event_id],
    );

    await db.query(
      `UPDATE holds
       SET status='EXPIRED'
       WHERE hold_id=$1 AND status='ACTIVE'`,
      [hold_id],
    );
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }
}
