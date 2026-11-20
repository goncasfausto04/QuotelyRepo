// The signed-in user's profile (public.users), used to sign emails with
// real details instead of "[Your Name]" placeholders.

export async function getSenderProfile(supabase, user) {
  const { data, error } = await supabase
    .from("users")
    .select("name, email, phone, company_name, location")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (error) console.warn("⚠️  Could not load user profile:", error.message);

  const clean = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    name: clean(data?.name) || clean(user.user_metadata?.name),
    email: clean(data?.email) || user.email || null,
    phone: clean(data?.phone),
    company: clean(data?.company_name),
    location: clean(data?.location),
  };
}

// Human readable block for prompts
export function profileForPrompt(p) {
  const lines = [
    p.name && `Name: ${p.name}`,
    p.company && `Company: ${p.company}`,
    p.email && `Email: ${p.email}`,
    p.phone && `Phone: ${p.phone}`,
    p.location && `Location: ${p.location}`,
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "(no profile details available)";
}
