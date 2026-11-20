import { supabase } from "../../supabaseClient.js";
import { ensureUserProfile } from "../../userProfile.js";

export async function loadProfile() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data, error } = await ensureUserProfile(auth.user);
  if (error) throw error;
  return data;
}

export const EDITABLE_FIELDS = ["name", "phone", "location", "company_name"];

export async function saveProfile(profile) {
  const changes = Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, profile[k]?.trim() || null]));
  const { error } = await supabase.from("users").update(changes).eq("auth_id", profile.auth_id);
  if (error) throw error;
}

// Uploads to profile-photos/<user id>/avatar.<ext> and returns a cache-busted URL
export async function uploadAvatar(authId, file) {
  if (!file.type.startsWith("image/")) throw new Error("Please upload an image file");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be smaller than 5MB");

  const path = `${authId}/avatar.${file.name.split(".").pop()}`;
  const { error } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
  if (error) throw error;

  const url = `${supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await supabase.from("users").update({ photo_url: url }).eq("auth_id", authId);
  if (updateError) throw updateError;
  return url;
}
