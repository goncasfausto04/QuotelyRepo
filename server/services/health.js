// Health checks shared by /health/* and the admin dashboard.

import { checkGmailAuth } from "./gmail.js";
import { isCustomSearchConfigured } from "./supplierSearch.js";

export async function checkDb(supabase) {
  const started = Date.now();
  const { error } = await supabase.from("briefings").select("id", { head: true, count: "exact" }).limit(1);
  if (error) throw error;
  return { latencyMs: Date.now() - started };
}

const settle = async (fn) => {
  try {
    return { ok: true, ...((await fn()) || {}) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

export async function fullHealth(supabase) {
  const [db, email] = await Promise.all([settle(() => checkDb(supabase)), settle(() => checkGmailAuth())]);
  return {
    db,
    email: { ...email, sender: process.env.GMAIL_API_SENDER || null },
    ai: { ok: !!process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || "gemini-2.5-flash" },
    search: {
      ok: !!process.env.GEMINI_API_KEY,
      detail: `Gemini web search${isCustomSearchConfigured() ? " + Google Custom Search fallback" : ""}, OpenStreetMap geocoding`,
    },
  };
}
