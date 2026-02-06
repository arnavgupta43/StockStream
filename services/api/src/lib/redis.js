import Redis from "ioredis";
let redis;
export async function initRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  redis = new Redis(url);
  await redis.ping();
  console.log("Connected to Redis");
}
export function getRedis() {
  if (!redis) {
    throw new Error("Redis not initialized");
  }
  return redis;
}
