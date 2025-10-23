// packages/redis/src/index.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

import { createClient, RedisClientType } from 'redis';

console.log("Redis URL:", process.env.REDIS_URL); 

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not set in environment");
}

const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", (err) => console.error("Redis Client Error", err));

(async () => {
  if (!redis.isOpen) {
    await redis.connect();
    console.log("✅ Connected to Redis");
  }
})();

export default redis;
