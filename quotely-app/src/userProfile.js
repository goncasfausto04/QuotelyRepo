import { supabase } from "./supabaseClient.js";

// Make sure the signed-in user has a row in the public "users" table.
// Signup can't always create it (e.g. when email confirmation is on), so
// pages that read the profile call this instead of assuming the row exists.
export async function ensureUserProfile(user, name) {
  if (!user) return { data: null, error: null };

  const { data: existing, error: readError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (readError) return { data: null, error: readError };
  if (existing) return { data: existing, error: null };

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        auth_id: user.id,
        email: user.email,
        name: name || user.user_metadata?.name || null,
      },
    ])
    .select()
    .single();
  return { data, error };
}
