/**
 * Lightweight in-memory rate limiter for public, unauthenticated API routes.
 *
 * Scope note: state lives in module memory, so it only limits requests
 * handled by the same warm serverless instance — it does not coordinate
 * across concurrent Vercel instances. That still blocks sustained
 * single-instance spam/abuse at zero infra cost, which is the residual
 * risk repeatedly flagged (but left unfixed) on these routes. A shared
 * store (e.g. Upstash Redis) would close the multi-instance gap but needs
 * a new dependency + env var, out of scope for this pass.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let requestsSinceSweep = 0;

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

// Trusts x-forwarded-for/x-real-ip as set by the platform (Vercel overwrites
// these for direct client connections rather than appending to a
// client-supplied value, unless the Enterprise "trusted proxy" opt-in is
// used, which this project isn't) — a client cannot spoof its way past this
// on the current deployment target.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export function checkRateLimit(
  request: Request,
  { limit, windowMs, scope }: { limit: number; windowMs: number; scope: string }
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();

  requestsSinceSweep++;
  if (requestsSinceSweep >= 200) {
    requestsSinceSweep = 0;
    sweep(now);
  }

  const key = `${scope}:${getClientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({ error: 'Zu viele Anfragen. Bitte versuchen Sie es in Kürze erneut.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}
