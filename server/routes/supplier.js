// Supplier quote form links:
//   POST /api/generate-supplier-link          (owner) get/create the public link
//   GET  /api/supplier-briefing/:token        (public) what is being requested
//   POST /api/supplier-submit-quote           (public) supplier submits a quote

import express from "express";
import { getOwnedBriefing } from "../lib/auth.js";
import { HttpError, asyncRoute } from "../lib/http.js";
import { rateLimit } from "../lib/rateLimit.js";
import { str, parseNumber, parseIntSafe, parseDate } from "../lib/parse.js";
import { ensureSupplierToken, supplierLinkFor } from "../services/supplierLink.js";
import { loadConversation } from "../services/conversation.js";

const TOKEN_RE = /^[a-f0-9]{64}$/;

const SPEC_LABELS = {
  item: "Item",
  quantity: "Quantity",
  delivery_location: "Delivery location",
  deadline: "Deadline",
};

// Requirements list shown to suppliers (budget is never shown)
function requirementsFrom(spec) {
  if (!spec) return [];
  const rows = Object.entries(SPEC_LABELS)
    .filter(([key]) => spec[key])
    .map(([key, label]) => ({ label, value: spec[key] }));
  if (spec.specifications?.length) rows.push({ label: "Specifications", value: spec.specifications.join("; ") });
  if (spec.extras?.length) rows.push({ label: "Other requirements", value: spec.extras.join("; ") });
  return rows;
}

async function briefingByToken(supabase, token, columns) {
  if (!TOKEN_RE.test(token || "")) throw new HttpError(404, "Invalid or expired link");
  const { data, error } = await supabase.from("briefings").select(columns).eq("supplier_link_token", token).maybeSingle();
  if (error || !data) throw new HttpError(404, "Invalid or expired link");
  return data;
}

function quoteRow(briefingId, q) {
  const supplierName = str(q.supplier_name, 200);
  const totalPrice = parseNumber(q.total_price);
  if (!supplierName) throw new HttpError(400, "Supplier name is required");
  if (totalPrice === null) throw new HttpError(400, "A valid total price is required");

  const row = {
    briefing_id: briefingId,
    supplier_name: supplierName,
    contact_email: str(q.contact_email, 200),
    contact_phone: str(q.contact_phone, 50),
    total_price: totalPrice,
    currency: (str(q.currency, 3) || "EUR").toUpperCase(),
    unit_price: parseNumber(q.unit_price),
    quantity: parseIntSafe(q.quantity),
    lead_time_days: parseIntSafe(q.lead_time_days),
    delivery_date: parseDate(q.delivery_date),
    payment_terms: str(q.payment_terms, 500),
    warranty_period: str(q.warranty_period, 200),
    warranty_months: parseIntSafe(q.warranty_months),
    shipping_cost: parseNumber(q.shipping_cost),
    notes: str(q.notes, 5000),
    input_method: "manual_supplier",
    submitted_by: "supplier",
  };
  // Store only the sanitised fields, not arbitrary client JSON
  const { briefing_id, ...analysis } = row;
  return { ...row, analysis_json: analysis };
}

export default function makeSupplierRouter({ supabase, requireAuth }) {
  const router = express.Router();

  router.post(
    "/generate-supplier-link",
    requireAuth,
    asyncRoute(async (req, res) => {
      const { briefingId, regenerate } = req.body || {};
      const briefing = await getOwnedBriefing(supabase, briefingId, req.user.id);
      const token = await ensureSupplierToken(supabase, briefing.id, { regenerate: !!regenerate });
      res.json({ token, supplierLink: supplierLinkFor(token), briefingId: briefing.id });
    }),
  );

  router.get(
    "/supplier-briefing/:token",
    asyncRoute(async (req, res) => {
      const b = await briefingByToken(supabase, req.params.token, "id, title, chat, conversation_state, created_at");
      const conv = loadConversation(b);
      res.json({
        id: b.id,
        title: b.title || "Quote Request",
        description: conv?.description || "No description available",
        requirements: requirementsFrom(conv?.spec),
        created_at: b.created_at,
      });
    }),
  );

  router.post(
    "/supplier-submit-quote",
    rateLimit({ max: 20, keyFn: (req) => req.ip, message: "Too many submissions from this network. Try again later." }),
    asyncRoute(async (req, res) => {
      const { token, quoteData } = req.body || {};
      if (!quoteData || typeof quoteData !== "object") throw new HttpError(400, "Quote data required");
      const briefing = await briefingByToken(supabase, token, "id");

      const { data, error } = await supabase.from("quotes").insert(quoteRow(briefing.id, quoteData)).select("id").single();
      if (error) throw new HttpError(500, `Failed to submit quote: ${error.message}`);

      console.log("✅ Supplier quote submitted:", data.id);
      res.json({ success: true, message: "Quote submitted successfully", quoteId: data.id });
    }),
  );

  return router;
}
