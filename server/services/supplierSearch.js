// Supplier search: AI writes search queries -> Google Custom Search ->
// AI picks real companies from the results (never invents contact details).

import { generateJson } from "../lib/ai.js";
import { HttpError } from "../lib/http.js";
import { searchQueriesPrompt, extractSuppliersPrompt } from "../prompts/search.js";

const MAX_QUERIES = 5;
const MAX_RESULTS = 15;
const MAX_SUPPLIERS = 7;

export const isSearchConfigured = () => !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID);

async function googleSearch(query) {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.search = new URLSearchParams({
    key: process.env.GOOGLE_SEARCH_API_KEY,
    cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
    q: query,
    num: "10",
  });
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.warn(`⚠️  Google search ${res.status} for: ${query}`);
      return [];
    }
    const data = await res.json();
    return (data.items || [])
      .filter((r) => r.title && r.link && r.snippet)
      .slice(0, 5)
      .map((r) => ({ title: r.title, url: r.link, content: r.snippet }));
  } catch (err) {
    console.warn(`⚠️  Google search failed for "${query}":`, err.message);
    return [];
  }
}

async function makeQueries(ai, ctx) {
  try {
    const queries = await generateJson(ai, searchQueriesPrompt(ctx));
    const clean = (Array.isArray(queries) ? queries : []).filter((q) => typeof q === "string" && q.trim()).slice(0, MAX_QUERIES);
    if (clean.length) return clean;
  } catch (err) {
    console.warn("⚠️  Query generation failed, using defaults:", err.message);
  }
  const base = ctx.spec.item || ctx.description;
  return [`${base} supplier ${ctx.location}`.trim(), `${base} wholesale ${ctx.location}`.trim()];
}

// ctx: { spec, description, location }
export async function searchSuppliers(ai, ctx) {
  if (!isSearchConfigured()) {
    throw new HttpError(503, "Supplier search is not configured on the server (missing Google Search API keys)");
  }

  const queries = await makeQueries(ai, ctx);
  const all = (await Promise.all(queries.map(googleSearch))).flat();
  const results = [...new Map(all.map((r) => [r.url, r])).values()].slice(0, MAX_RESULTS);
  if (!results.length) return { suppliers: [], queries };

  const parsed = await generateJson(ai, extractSuppliersPrompt({ ...ctx, results }));
  const suppliers = (parsed?.suppliers || []).slice(0, MAX_SUPPLIERS).map((s) => ({
    name: s.name || "Unknown",
    website: s.website || null,
    contact_email: s.contact_email || null,
    phone: s.phone || null,
    note: s.note || "",
  }));
  return { suppliers, queries };
}
