/**
 * Lightweight in-memory rate limiter, keyed by client IP.
 *
 * Note: this state lives in the serverless function's memory, so it resets on
 * cold start and isn't shared across concurrent instances — it throttles abuse
 * from a single warm instance, not a hard distributed limit. For guaranteed
 * enforcement under real load, back this with Upstash Redis or Vercel KV instead.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

// Periodically drop stale buckets so this map can't grow unbounded.
function cleanup(now: number) {
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}

export function getClientIp(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    return request.headers.get('x-real-ip') || 'unknown';
}

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    if (buckets.size > 5000) cleanup(now);

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }

    bucket.count += 1;
    return bucket.count > limit;
}
