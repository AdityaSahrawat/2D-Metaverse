// packages/redis/src/index.ts
import dotenv from 'dotenv';
import path from 'path';

// 🔥 load env relative to this file
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

import { createClient, RedisClientType } from 'redis';

console.log("Redis URL:", process.env.REDIS_URL); // should now be defined

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not set in environment");
}

const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

export default redis;
