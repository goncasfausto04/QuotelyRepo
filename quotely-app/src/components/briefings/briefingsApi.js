import { supabase } from "../../supabaseClient.js";

// Briefings of the signed-in user + quote count per briefing (2 queries)
export async function loadBriefings() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];
  const { data, error } = await supabase
    .from("briefings")
    .select("id, title, created_at, conversation_finished")
    .eq("user_auth_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!data?.length) return [];

  const { data: rows } = await supabase.from("quotes").select("briefing_id").in("briefing_id", data.map((b) => b.id));
  const counts = {};
  for (const r of rows || []) counts[r.briefing_id] = (counts[r.briefing_id] || 0) + 1;
  return data.map((b) => ({ ...b, quoteCount: counts[b.id] || 0 }));
}

export async function renameBriefing(id, title) {
  const { error } = await supabase.from("briefings").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function deleteBriefing(id) {
  const { error } = await supabase.from("briefings").delete().eq("id", id);
  if (error) throw error;
}
