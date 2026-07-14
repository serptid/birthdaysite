type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  var __birthdaysiteRateLimits: Map<string, RateLimitEntry> | undefined;
}

const buckets = globalThis.__birthdaysiteRateLimits ?? new Map<string, RateLimitEntry>();
globalThis.__birthdaysiteRateLimits = buckets;

export function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();

  if (buckets.size > 10000) {
    for (const [bucketKey, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  return { ok: true, retryAfter: 0 };
}
