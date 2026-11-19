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
let lastConfirmedUp = 0;
const UP_FRESH_MS = 5 * 60 * 1000;

// Wake the backend (and DB) up as early as possible, e.g. on app load.
// Resolves true once the server answers, false if it never does (~2 min).
// Note: while Render is starting it answers 502 *without* CORS headers, which
// the browser reports as a network error, so we just keep polling.
export function warmUpBackend() {
  if (Date.now() - lastConfirmedUp < UP_FRESH_MS) return Promise.resolve(true);
  if (!warmUpPromise) {
    warmUpPromise = (async () => {
      try {
        for (let attempt = 0; attempt < 12; attempt++) {
          try {
            const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(20000) });
            if (res.ok) {
              lastConfirmedUp = Date.now();
              return true;
            }
          } catch {
            /* still sleeping / restarting */
          }
          await sleep(5000);
        }
        return false;
      } finally {
        warmUpPromise = null;
      }
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

  // Requests that must not be repeated (sending email, chat answers) only go
  // out once the server is confirmed awake, so they don't die on a cold start.
  if (!canRetry) await warmUpBackend();

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
          ? "The server took too long to respond — please try again"
          : "Can't reach the Quotely server. It may still be starting up (up to a minute) — please try again",
        0,
      );
      if (attempt < maxAttempts) {
        await sleep(3000 * attempt);
        continue;
      }
      throw lastError;
    }

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      lastConfirmedUp = Date.now();
      return data;
    }

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
