// Loading / saving the chat log (briefings.chat) for a briefing.
// Message roles: "AI", "User", "Email" (generated RFQ), "SupplierResults" (JSON, hidden).

import { supabase } from "../../supabaseClient.js";

export const GREETING = {
  role: "AI",
  content: "Hi! What do you need quotes for? Describe it in your own words, e.g. \"500 cotton t-shirts with our logo, delivered to Lisbon by March\".",
};

const LEGACY_HIDDEN = new Set(["SupplierSearchPrompt"]);

export async function loadChat(briefingId) {
  const { data, error } = await supabase
    .from("briefings")
    .select("chat, conversation_state")
    .eq("id", briefingId)
    .single();
  if (error) throw error;
  const chat = (Array.isArray(data?.chat) ? data.chat : []).filter((m) => !LEGACY_HIDDEN.has(m.role));
  return { messages: chat.length ? chat : [GREETING], spec: data?.conversation_state?.spec || null };
}

// Saves are chained so they reach the DB in order (an older, shorter list
// finishing last would otherwise wipe newer messages).
export function makeChatSaver(briefingId) {
  let queue = Promise.resolve();
  return (messages) => {
    queue = queue.then(async () => {
      const { error } = await supabase.from("briefings").update({ chat: messages }).eq("id", briefingId);
      if (error) console.error("Error saving chat:", error.message);
    });
    return queue;
  };
}

export async function resetBriefingConversation(briefingId) {
  const { error } = await supabase
    .from("briefings")
    .update({ chat: [GREETING], conversation_state: null, conversation_finished: false })
    .eq("id", briefingId);
  if (error) throw error;
}

export const lastOfRole = (messages, role) => [...messages].reverse().find((m) => m.role === role);

export function suppliersFrom(messages) {
  try {
    return JSON.parse(lastOfRole(messages, "SupplierResults")?.content || "[]");
  } catch {
    return [];
  }
}

export function phaseFrom(messages) {
  if (messages.some((m) => m.role === "Email")) return "done";
  if (messages.some((m) => m.role === "User")) return "interview";
  return "new";
}
