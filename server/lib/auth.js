// Authentication + ownership helpers.
//
// The backend uses the Supabase SERVICE key, which bypasses Row Level Security.
// That means every route that touches a briefing MUST check that the caller
// actually owns it, otherwise anyone on the internet could read inboxes, send
// email from the Quotely Gmail account, or overwrite other users' data.

const TOKEN_CACHE_TTL_MS = 60 * 1000;
const tokenCache = new Map(); // access token -> { user, expires }

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of tokenCache) {
    if (entry.expires <= now) tokenCache.delete(key);
  }
}
setInterval(pruneCache, TOKEN_CACHE_TTL_MS).unref();

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Express middleware: requires `Authorization: Bearer <supabase access token>`.
// Sets req.user on success.
export function makeRequireAuth(supabase) {
  return async function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: "Not signed in" });
    }
    const token = match[1].trim();

    const cached = tokenCache.get(token);
    if (cached && cached.expires > Date.now()) {
      req.user = cached.user;
      return next();
    }

    try {
      const { data, error } = await supabase.auth.getUser(token);
      const unreachable =
        error && (error.name === "AuthRetryableFetchError" || !error.status || error.status >= 500);
      if (unreachable) {
        console.error("❌ Supabase auth unreachable:", error.message);
        return res.status(503).json({ error: "Database is waking up, please retry in a few seconds" });
      }
      if (error || !data?.user) {
        return res.status(401).json({ error: "Session expired, please sign in again" });
      }
      tokenCache.set(token, { user: data.user, expires: Date.now() + TOKEN_CACHE_TTL_MS });
      req.user = data.user;
      next();
    } catch (err) {
      // Supabase unreachable (e.g. project paused / waking up)
      console.error("❌ Auth check failed:", err.message);
      res.status(503).json({ error: "Authentication service unavailable, try again shortly" });
    }
  };
}

// Throws HttpError(404) unless the briefing exists and belongs to userId.
// Returns the requested columns of the briefing.
export async function getOwnedBriefing(supabase, briefingId, userId, columns = "id") {
  if (!briefingId) throw new HttpError(400, "Briefing ID is required");

  const cols = columns.split(",").map((c) => c.trim());
  if (!cols.includes("user_auth_id")) cols.push("user_auth_id");

  const { data, error } = await supabase
    .from("briefings")
    .select(cols.join(","))
    .eq("id", briefingId)
    .maybeSingle();

  if (error) {
    // invalid uuid syntax etc. -> treat as not found
    if (error.code === "22P02") throw new HttpError(404, "Briefing not found");
    throw new HttpError(500, `Database error: ${error.message}`);
  }
  // Same response for "doesn't exist" and "not yours" so ids can't be probed.
  if (!data || data.user_auth_id !== userId) {
    throw new HttpError(404, "Briefing not found");
  }
  return data;
}

// Wraps an async route handler so thrown errors become JSON responses
// instead of unhandled rejections.
export const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Very small in-memory fixed-window rate limiter (per user or IP).
// Good enough for a single Render instance; resets on restart.
export function rateLimit({ windowMs, max, keyFn, message }) {
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
