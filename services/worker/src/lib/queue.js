import { getRedis } from "./redis.js";

export const STREAM_KEY = "inventory.events";
export const GROUP_NAME = "inventory.cg";
export const CONSUMER_NAME = process.env.CONSUMER_NAME || "worker_1";

export async function initStreamGroup() {
  try {
    const redis = getRedis();
    await redis.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "0", "MKSTREAM");
    console.log(` [worher] stream group created`);
  } catch (e) {
    if (!String(e.message).includes("BUSYGROUP")) throw e;
    console.log(`[worker] stream group already exits`);
  }
}

export async function readEvents(blockMs = 5000) {
  const redis = getRedis();

  return redis.xreadgroup(
    "GROUP",
    GROUP_NAME,
    CONSUMER_NAME,
    "COUNT",
    10,
    "BLOCK",
    blockMs,
    "STREAMS",
    STREAM_KEY,
    ">",
  );
}

export async function ackEvent(message_id) {
  const redis = getRedis();
  redis.xack(STREAM_KEY, GROUP_NAME, message_id);
}
