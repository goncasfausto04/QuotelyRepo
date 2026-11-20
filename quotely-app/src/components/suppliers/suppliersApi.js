// Supplier search results: saved on the briefing (conversation_state.suppliers),
// with a fallback to the old chat "SupplierResults" messages.

import { supabase } from "../../supabaseClient.js";
import { apiFetch } from "../../api.js";

export async function loadSavedSuppliers(briefingId) {
  const { data } = await supabase.from("briefings").select("chat, conversation_state").eq("id", briefingId).single();
  const saved = data?.conversation_state?.suppliers;
  if (saved?.suppliers) return saved;

  const legacy = [...(Array.isArray(data?.chat) ? data.chat : [])].reverse().find((m) => m.role === "SupplierResults");
  try {
    return { suppliers: JSON.parse(legacy?.content || "[]"), center: null, location: "" };
  } catch {
    return { suppliers: [], center: null, location: "" };
  }
}

export const searchSuppliers = (briefingId, location) =>
  apiFetch("/api/search-suppliers", { method: "POST", json: { briefingId, location }, retry: true, timeoutMs: 120000 });

// Stable id for a supplier (used for selection and map/list syncing)
export const supplierKey = (s) => (s.contact_email || s.website || s.name || "").toLowerCase();
