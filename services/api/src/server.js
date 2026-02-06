// import app and other fuctions and start the server
import { createApp } from "./app";
import { initDB } from "./lib/db";
import { initRedis } from "./lib/redis";
import { initStream } from "./lib/queue";
const PORT = process.env.PORT || 3000;
async function main() {
  await initDB();
  await initRedis();
  await initStream();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
main().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
