import { initDb } from "./lib/db.js";
import { initRedis } from "./lib/redis.js";
import { initStreamGroup, readEvents, ackEvent } from "./lib/queue.js";
import { dispatch } from "./handlers/index.js";

function parseFieldsToObject(fieldsArr) {
  // fieldsArr like [k1,v1,k2,v2...]
  const obj = {};
  for (let i = 0; i < fieldsArr.length; i += 2)
    obj[fieldsArr[i]] = fieldsArr[i + 1];
  return obj;
}

async function main() {
  await initDb();
  await initRedis();
  await initStreamGroup();

  console.log("[worker] consuming...");

  while (true) {
    const data = await readEvents(5000);
    if (!data) continue;

    // data: [[streamKey, [[messageId, [field, value, ...]], ...]]]
    const [, messages] = data[0];

    for (const [messageId, fields] of messages) {
      const msg = parseFieldsToObject(fields);

      const type = msg.type;
      const payload = JSON.parse(msg.payload);

      // Ensure event_id exists
      payload.event_id = msg.event_id;

      try {
        await dispatch(type, payload);
        await ackEvent(messageId);
      } catch (e) {
        console.error("[worker] handler error:", e);
        // no ack => will be pending; later we’ll implement retry/claim
      }
    }
  }
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
