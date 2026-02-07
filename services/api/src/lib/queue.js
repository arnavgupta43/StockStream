//queue file for redis
import { getRedis } from "./redis.js";
export const STREAM_KEY = "inventory.events";

export async function initStream(params) {
  //Stream is created automatically on the first message
  console.log(`[api] stream created: ${STREAM_KEY}`);
}
export async function publishEvent({ event_id, type, payload }) {
  const redis = getRedis();
  await redis.xadd(
    STREAM_KEY,
    "MAXLEN",
    "~",
    10000,
    "*",
    "event_id",
    event_id,
    "type",
    type,
    "payload",
    JSON.stringify(payload),
  );
}
