// Saving quotes (shared by the Inbox approve flow and the Analyze tab).

import { supabase } from "../supabaseClient.js";
import { apiFetch } from "../api.js";

// Columns of the quotes table filled from an AI analysis (the rest stays in analysis_json)
export const QUOTE_DB_FIELDS = [
  "supplier_name", "contact_email", "contact_phone", "total_price", "currency", "unit_price", "quantity",
  "lead_time_days", "delivery_date", "payment_terms", "warranty_period", "warranty_months", "shipping_cost", "notes",
];

export function pickQuoteFields(obj) {
  const out = {};
  for (const key of QUOTE_DB_FIELDS) if (obj?.[key] !== undefined) out[key] = obj[key];
  return out;
}

// The API returns the analysis as a JSON string (legacy) or object
export function parseAnalysis(value) {
  const analysis = typeof value === "string" ? JSON.parse(value) : value;
  if (!analysis || typeof analysis !== "object") throw new Error("Could not read the AI analysis");
  return analysis;
}

export async function analyzeEmailText(emailText) {
  const data = await apiFetch("/api/analyze-email", { method: "POST", json: { emailText }, retry: true });
  return parseAnalysis(data.analysis);
}

export async function analyzePdf(briefingId, file) {
  const form = new FormData();
  form.append("pdfFile", file);
  form.append("briefingId", briefingId);
  const data = await apiFetch("/api/analyze-pdf", { method: "POST", body: form, timeoutMs: 180000 });
  return { analysis: parseAnalysis(data.analysis), pdfUrl: data.pdfUrl || null };
}

// Insert a quote row: analysis -> known columns + full analysis_json
export async function insertQuote(briefingId, analysis, extra = {}) {
  const { data, error } = await supabase
    .from("quotes")
    .insert({ briefing_id: briefingId, ...pickQuoteFields(analysis), analysis_json: analysis, ...extra })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listQuotes(briefingId) {
  const { data, error } = await supabase.from("quotes").select("*").eq("briefing_id", briefingId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteQuote(id) {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) throw error;
}
