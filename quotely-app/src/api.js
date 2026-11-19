// Single place for talking to the Quotely backend.
// - attaches the Supabase access token (the backend requires it)
// - waits through Render free-tier cold starts (~30-60s) instead of failing
// - only auto-retries requests that are safe to repeat, so an email is never sent twice
import { supabase } from "./supabaseClient.js";

export const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "");

const COLD_START_STATUSES = new Set([502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

let warmUpPromise = null;

// Wake the backend (and DB) up as early as possible, e.g. on app load.
// Resolves true once the server answers, false if it never does.
export function warmUpBackend() {
  if (!warmUpPromise) {
    warmUpPromise = (async () => {
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          const res = await fetch(`${API_URL}/health/db`, { signal: AbortSignal.timeout(20000) });
          if (res.ok || res.status === 503) return true; // server is up even if DB is waking
        } catch {
          /* still sleeping */
        }
        await sleep(5000);
      }
      warmUpPromise = null;
      return false;
    })();
  }
  return warmUpPromise;
}

/**
 * apiFetch("/api/send-email", { method: "POST", json: {...} })
 * Returns parsed JSON; throws ApiError with a readable message on failure.
 *
 * options.json      -> sent as JSON body
 * options.body      -> raw body (e.g. FormData)
 * options.retry     -> override auto-retry (defaults to true for GET only)
 * options.timeoutMs -> per-attempt timeout (default 90s, AI calls can be slow)
 */
export async function apiFetch(path, options = {}) {
  const { json, retry, timeoutMs = 90000, headers = {}, ...rest } = options;
  const method = (rest.method || "GET").toUpperCase();
  const canRetry = retry ?? (method === "GET" || method === "HEAD");
  const maxAttempts = canRetry ? 4 : 1;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(`${API_URL}${path}`, {
        ...rest,
        method,
        headers: {
          ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(await authHeader()),
          ...headers,
        },
        body: json !== undefined ? JSON.stringify(json) : rest.body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      lastError = new ApiError(
        err?.name === "TimeoutError"
          ? "The server took too long to respond. It may be waking up, please try again."
          : "Can't reach the Quotely server. It may be waking up (takes up to a minute), please try again.",
        0,
      );
      if (attempt < maxAttempts) {
        await sleep(3000 * attempt);
        continue;
      }
      throw lastError;
    }

    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;

    lastError = new ApiError(data.error || data.details || `Server error (${res.status})`, res.status, data);
    if (canRetry && COLD_START_STATUSES.has(res.status) && attempt < maxAttempts) {
      await sleep(3000 * attempt);
      continue;
    }
    if (res.status === 401) {
      lastError.message = data.error || "Your session expired. Please sign in again.";
    }
    throw lastError;
  }
  throw lastError;
}
