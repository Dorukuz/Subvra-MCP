import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

let redis: IORedis;

declare global {
  var _redis: IORedis | undefined;
}

function createRedisClient(): IORedis {
  const client = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  });

  client.on("error", (err: Error & { code?: string }) => {
    if (!["ECONNREFUSED", "ENOTFOUND"].includes(err.code ?? "")) {
      console.error("[redis] Error:", err.message);
    }
  });

  return client;
}

if (process.env.NODE_ENV === "development") {
  if (!global._redis) {
    global._redis = createRedisClient();
  }
  redis = global._redis;
} else {
  redis = createRedisClient();
}

export default redis;
