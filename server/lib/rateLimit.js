// Very small in-memory fixed-window rate limiter (per user or IP).
// Good enough for a single Render instance; resets on restart.

export const HOUR = 60 * 60 * 1000;

export function rateLimit({ windowMs = HOUR, max, keyFn = (req) => req.user?.id || req.ip, message }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: message || "Too many requests, slow down" });
    }
    next();
  };
}
