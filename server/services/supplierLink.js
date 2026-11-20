// Public link where suppliers can submit their quote through a form.

import { randomBytes } from "crypto";
import { HttpError } from "../lib/http.js";

export const frontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim().replace(/\/+$/, "");

export const supplierLinkFor = (token) => `${frontendUrl()}/supplier-response/${token}`;

// Returns the briefing's token, creating one if needed (or if regenerate)
export async function ensureSupplierToken(supabase, briefingId, { regenerate = false } = {}) {
  const { data, error } = await supabase.from("briefings").select("supplier_link_token").eq("id", briefingId).single();
  if (error) throw new HttpError(500, `Failed to load briefing: ${error.message}`);

  let token = data?.supplier_link_token;
  if (!token || regenerate) {
    token = randomBytes(32).toString("hex");
    const { error: upErr } = await supabase.from("briefings").update({ supplier_link_token: token }).eq("id", briefingId);
    if (upErr) throw new HttpError(500, `Failed to save supplier link: ${upErr.message}`);
  }
  return token;
}
