// CORS: only our frontend(s) may call the API from a browser.
//   FRONTEND_URL             comma separated exact origins
//   ALLOWED_ORIGIN_SUFFIXES  host suffixes for Vercel preview URLs, e.g.
//                            "-goncasfausto04s-projects.vercel.app" (only YOUR account's)
// Localhost is always allowed for development.

import cors from "cors";

const list = (v) =>
  (v || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

export function makeCors() {
  const origins = new Set(list(process.env.FRONTEND_URL));
  const suffixes = list(process.env.ALLOWED_ORIGIN_SUFFIXES).map((s) => s.toLowerCase());

  const matchesSuffix = (origin) => {
    try {
      const { protocol, hostname } = new URL(origin);
      return protocol === "https:" && suffixes.some((s) => hostname.toLowerCase().endsWith(s));
    } catch {
      return false;
    }
  };

  const allowed = (origin) =>
    origins.size === 0 ||
    origins.has(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    matchesSuffix(origin);

  return {
    origins,
    middleware: cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true); // curl, health checks, server-to-server
        const normalized = origin.replace(/\/+$/, "");
        if (allowed(normalized)) return cb(null, true);
        console.warn(`🚫 CORS blocked origin: ${origin} (add it to FRONTEND_URL or ALLOWED_ORIGIN_SUFFIXES)`);
        cb(null, false);
      },
    }),
  };
}
