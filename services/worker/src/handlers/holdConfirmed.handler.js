import { getDb } from "../lib/db.js";
function uuid() {
  return crypto.randomUUID();
}
export async function handleHoldConfirm(payload) {
  const db = getDb();
  const { event_id, hold_id, payment_ref } = payload;
  await db.query("BEGIN");
  try {
    await db.query(
      `INSERT INTO processed_events(event_id,event_type) VALUES($1,'HOLD_CONFIRM') on conflict (event_id) do nothing`,
      [event_id],
    );
    const res = await db.query(
      `UPDATE holds SET status='CONFIRMED' where hold_id=$1 AND STATUS='ACTIVE' and expires_at > now() RETURNING user_id,sku,qty`,
      [hold_id],
    );
    if (res.rowCount == 1) {
      const { user_id, sku, qty } = res.row[0];
      await db.query(
        `INSERT INTO orders(order_id, hold_id, user_id, sku, qty, status, payment_ref)
         VALUES ($1,$2,$3,$4,$5,'PAID',$6)
         ON CONFLICT (hold_id) DO NOTHING`,
        [uuid(), hold_id, user_id, sku, qty, payment_ref],
      );
    }
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
