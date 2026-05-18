import { kv } from "@vercel/kv";

export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<{ isLimited: boolean; recentCount: number }> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  try {
    const timestamps = await kv.lrange<number>(key, 0, -1);
    const recent = timestamps.filter((ts) => ts > windowStart);
    if (recent.length >= maxRequests) {
      return { isLimited: true, recentCount: recent.length };
    }
    await kv.lpush(key, now);
    await kv.expire(key, windowSeconds);
    return { isLimited: false, recentCount: recent.length };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[rate-limit] KV unavailable in dev — allowing request:", err);
      return { isLimited: false, recentCount: 0 };
    }
    return { isLimited: true, recentCount: maxRequests };
  }
}
