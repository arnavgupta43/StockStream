import crypto from "crypto";
import { getRedis } from "../lib/redis";
import { publishEvent } from "../lib/queue";
import { EVENT_TYPES } from "../../../../shared/common/src/eventTypes";

const HOLD_TTL_SECONDS = 300;
function uuid() {
  return crypto.randomUUID();
}

export async function reserve({ sku, qty, user_id, idempotency_key }) {
  if (!sku || !user_id || !Number.isInteger(qty) || qty <= 0) {
    const err = new Error("sku, qty(>0) and user_id is required");
    err.code = "BAD_REQUEST";
    throw err;
  }
  if (!idempotency_key) {
    const err = new Error("idempotency_key is required");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const redis = getRedis();
  const idemKey = `idem:${idempotency_key}`;
  const existing = await redis.get(idemKey);
  if (existing) {
    return { hold_id: existing, idempotent: true };
  }
  const hold_id = `H-${uuid()}`;
  const holdKey = `hold:${hold_id}`;
  const stockKey = `stock:${sku}`;
  //replace this with lua script next
  while (true) {
    await redis.watch(stockKey);
    const stockStr = await redis.get(stockKey);
    const stock = Number(stockStr ?? 0);
    if (stock < qty) {
      await redis.unwatch();
      const err = new Error(`Sold out: ${stock} quantity left`);
      err.code = "SOLD_OUT";
      throw err;
    }
    const expires_at = new Date(
      Date.now() + HOLD_TTL_SECONDS * 1000,
    ).toISOString();
    const holdpayload = { sku, qty, user_id, expires_at };
    const tx = redis.multi();
    tx.decrby(stockKey, qty);
    tx.set(holdKey, JSON.stringify(holdpayload), "EX", HOLD_TTL_SECONDS);
    tx.set(idemKey, hold_id, "EX", 24 * 60 * 60);
    const result = await tx.execute();
    if (result) {
      const event_id = uuid();
      await publishEvent({
        event_id,
        type: EVENT_TYPES.HOLD_CREATED,
        payload: { hold_id, sku, qty, user_id, expires_at, idempotency_key },
      });
      return { hold_id, expires_at };
    }
  }
}

export async function confirm({ hold_id, payment_ref }) {
  if (!hold_id) {
    const err = new Error("hold_id is required");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const redis = getRedis();
  const holdKey = `hold:${hold_id}`;
  const raw = redis.get(holdKey);
  if (!raw) {
    const err = new Error("Order Checkout Expired");
    err.code = "EXPIRED";
    throw err;
  }
  //else publis the event in redis stream and delete the entry in redis
  const event_id = uuid();
  await publishEvent({
    event_id,
    type: EVENT_TYPES.HOLD_CONFIRMED,
    payload: { hold_id, payment_ref: payment_ref ?? nul },
  });
  await redis.del(holdKey);
  return { ok: true, hold_id };
}

export async function cancel({ hold_id }) {
  if (!hold_id) {
    const err = new Error("hold_id is required");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const redis = getRedis();
  const holdKey = `hold:${hold_id}`;
  const raw = await redis.get(holdKey);
  if (!raw) {
    const err = new Error("expired");
    err.code = "EXPIRED";
    throw err;
  }
  const hold = JSON.parse(raw);
  const stockKey = `stcock:${hold.sku}`;
  //release stock
  await redis.multi().del(holdKey).incrby(stockKey, hold.qty).exec();
  const event_id = uuid();
  await publishEvent({
    event_id,
    type: EVENT_TYPES.HOLD_CANCELLED,
    payload: { hold_id },
  });
  return { ok: true, hold_id, release: true };
}
