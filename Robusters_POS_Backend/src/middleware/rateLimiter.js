/**
 * Minimal in-memory sliding-window rate limiter.
 * No new dependency — mirrors the in-memory Map pattern already used by
 * utils/otpService.js. Fine for a single-instance deployment; swap for a
 * shared store (e.g. Redis) if this ever runs multiple instances.
 */

const buckets = new Map(); // key -> { count, windowStart }

const rateLimit = ({ windowMs = 60_000, max = 10, keyPrefix = 'rl' } = {}) => {
  return (req, res, next) => {
    const identity = req.user?.id || req.ip;
    const key = `${keyPrefix}:${identity}`;
    const now = Date.now();

    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      buckets.set(key, { count: 1, windowStart: now });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfterSeconds = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: `Too many requests. Please try again in ${retryAfterSeconds}s.`,
        error: { code: 'RATE_LIMITED' },
      });
    }

    bucket.count += 1;
    next();
  };
};

// Periodic cleanup so the map doesn't grow unbounded on a long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > 10 * 60_000) {
      buckets.delete(key);
    }
  }
}, 5 * 60_000).unref();

module.exports = { rateLimit };
