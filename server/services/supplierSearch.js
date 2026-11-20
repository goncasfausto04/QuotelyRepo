// Supplier search.
//   1. Gemini with the Google Search tool finds real companies (with addresses).
//   2. Fallback: Google Custom Search + AI extraction, if those keys are configured.
//   3. Every supplier is geocoded (OpenStreetMap) so the UI can show a map.

import { generateJson, generateGroundedJson } from "../lib/ai.js";
import { HttpError } from "../lib/http.js";
import { searchQueriesPrompt, extractSuppliersPrompt, groundedSuppliersPrompt } from "../prompts/search.js";
import { geocode, geocodeSupplier } from "./geocode.js";

const MAX_SUPPLIERS = 8;

export const isCustomSearchConfigured = () => !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID);

const clean = (v) => (typeof v === "string" && v.trim() && !/^(null|n\/a|unknown)$/i.test(v.trim()) ? v.trim() : null);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map((s) => ({
      name: clean(s?.name) || "Unknown supplier",
      website: clean(s?.website),
      contact_email: EMAIL_RE.test(clean(s?.contact_email) || "") ? clean(s.contact_email).toLowerCase() : null,
      phone: clean(s?.phone),
      address: clean(s?.address),
      city: clean(s?.city),
      country: clean(s?.country),
      note: clean(s?.note) || "",
    }))
    .filter((s) => s.name !== "Unknown supplier" && !seen.has(s.name.toLowerCase()) && seen.add(s.name.toLowerCase()))
    .slice(0, MAX_SUPPLIERS);
}

async function searchWithGemini(ai, ctx) {
  const parsed = await generateGroundedJson(ai, groundedSuppliersPrompt(ctx));
  return normalize(parsed?.suppliers);
}

// ---- Fallback: Google Custom Search ----
async function googleSearch(query) {
  const url = `https://www.googleapis.com/customsearch/v1?${new URLSearchParams({
    key: process.env.GOOGLE_SEARCH_API_KEY,
    cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
    q: query,
    num: "10",
  })}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).filter((r) => r.title && r.link).slice(0, 5).map((r) => ({ title: r.title, url: r.link, content: r.snippet || "" }));
  } catch {
    return [];
  }
}

async function searchWithCustomSearch(ai, ctx) {
  const queries = (await generateJson(ai, searchQueriesPrompt(ctx)).catch(() => [])) || [];
  const list = (Array.isArray(queries) && queries.length ? queries : [`${ctx.spec.item || ctx.description} supplier ${ctx.location}`]).slice(0, 4);
  const all = (await Promise.all(list.map(googleSearch))).flat();
  const results = [...new Map(all.map((r) => [r.url, r])).values()].slice(0, 15);
  if (!results.length) return [];
  const parsed = await generateJson(ai, extractSuppliersPrompt({ ...ctx, results }));
  return normalize(parsed?.suppliers);
}

// ctx: { spec, description, location } -> { suppliers: [...with lat/lng], center, source }
export async function searchSuppliers(ai, ctx) {
  let suppliers = [];
  let source = "gemini";
  try {
    suppliers = await searchWithGemini(ai, ctx);
  } catch (err) {
    console.warn("⚠️  Gemini supplier search failed:", err.message);
    if (!isCustomSearchConfigured()) throw err;
  }
  if (!suppliers.length && isCustomSearchConfigured()) {
    source = "custom-search";
    suppliers = await searchWithCustomSearch(ai, ctx);
  }
  if (!suppliers.length && !ctx.location) throw new HttpError(404, "No suppliers found. Try adding a location.");

  // Geocode (sequential, rate-limited inside geocode.js)
  for (const s of suppliers) Object.assign(s, (await geocodeSupplier(s)) || { lat: null, lng: null });
  const center = ctx.location ? await geocode(ctx.location) : null;

  return { suppliers, center: center ? { lat: center.lat, lng: center.lng } : null, source };
}
