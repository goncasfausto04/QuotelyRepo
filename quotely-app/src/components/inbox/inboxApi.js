// Data access for the inbox: Gmail (via API) + statuses/quotes (Supabase).

import { supabase } from "../../supabaseClient.js";
import { apiFetch } from "../../api.js";
import { parseAddress } from "./emailUtils.js";
import { analyzeEmailText, insertQuote } from "../../lib/quotes.js";

export async function fetchEmails(briefingId) {
  const [data, statusRes] = await Promise.all([
    apiFetch(`/api/briefings/${briefingId}/emails`),
    supabase.from("email_statuses").select("message_id, status").eq("briefing_id", briefingId),
  ]);
  const statusMap = Object.fromEntries((statusRes.data || []).map((s) => [s.message_id, s.status]));
  return (data.emails || [])
    .map((e) => ({ ...e, status: statusMap[e.id] || "pending" }))
    .filter((e) => e.status !== "deleted");
}

export async function setEmailStatus(briefingId, messageId, status) {
  const { error } = await supabase
    .from("email_statuses")
    .upsert(
      { briefing_id: briefingId, message_id: messageId, status, updated_at: new Date().toISOString() },
      { onConflict: "briefing_id,message_id" },
    );
  if (error) throw error;
}

// Title, generated email, requirements and found suppliers
export async function fetchBriefingInfo(briefingId) {
  const { data, error } = await supabase.from("briefings").select("title, chat, conversation_state").eq("id", briefingId).single();
  if (error || !data) return { title: "", generatedEmail: "", suppliers: [], spec: null };
  const chat = Array.isArray(data.chat) ? [...data.chat].reverse() : [];
  let found = data.conversation_state?.suppliers?.suppliers;
  if (!found) {
    try {
      found = JSON.parse(chat.find((m) => m.role === "SupplierResults")?.content || "[]");
    } catch {
      found = [];
    }
  }
  return {
    title: data.title || "",
    generatedEmail: chat.find((m) => m.role === "Email")?.content || "",
    suppliers: (found || []).filter((s) => s?.contact_email).map((s) => ({ name: s.name, email: String(s.contact_email).trim() })),
    spec: data.conversation_state?.spec || null,
  };
}

export const fetchEmailStatus = () => apiFetch("/api/email/status");

// AI-analyse a supplier email and save it as a quote (once per email)
export async function saveQuoteFromEmail(briefingId, email) {
  const { data: existing } = await supabase.from("quotes").select("id").eq("briefing_id", briefingId).eq("message_id", email.id).limit(1);
  if (existing?.length) return;

  const analysis = await analyzeEmailText(email.body || email.snippet || "");
  const sender = parseAddress(email.from);
  if (!analysis.contact_email && sender.address) analysis.contact_email = sender.address;
  if (!analysis.supplier_name && sender.name && sender.name !== sender.address) analysis.supplier_name = sender.name;
  await insertQuote(briefingId, analysis, {
    raw_email_text: email.body,
    input_method: "email",
    submitted_by: "supplier",
    message_id: email.id,
  });
}

export const sendEmail = (payload) => apiFetch("/api/send-email", { method: "POST", json: payload });
