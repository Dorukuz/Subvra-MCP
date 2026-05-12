import redis from "./redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `ratelimit:${key}:${now - (now % windowSeconds)}`;

    const multi = redis.multi();
    multi.incr(windowKey);
    multi.expire(windowKey, windowSeconds);
    const results = await multi.exec();

    const count = (results?.[0]?.[1] as number) || 0;
    const allowed = count <= maxRequests;

    return {
      allowed,
      remaining: Math.max(0, maxRequests - count),
      resetIn: windowSeconds - (now % windowSeconds),
    };
  } catch {
    // If Redis is unavailable, allow the request (fail-open for availability)
    // In production, ensure Redis is always running
    console.warn("[rate-limit] Redis unavailable, allowing request");
    return { allowed: true, remaining: maxRequests, resetIn: windowSeconds };
  }
}

export async function rateLimitByIp(
  ip: string,
  endpoint: string,
  maxRequests = 30,
  windowSeconds = 60
): Promise<RateLimitResult> {
  return rateLimit(`ip:${ip}:${endpoint}`, maxRequests, windowSeconds);
}

export async function rateLimitByUser(
  userId: string,
  endpoint: string,
  maxRequests = 10,
  windowSeconds = 60
): Promise<RateLimitResult> {
  return rateLimit(`user:${userId}:${endpoint}`, maxRequests, windowSeconds);
}
