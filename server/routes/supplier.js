import express from "express";
import { getOwnedBriefing, asyncRoute, rateLimit, HttpError } from "../lib/auth.js";

const TOKEN_RE = /^[a-f0-9]{64}$/;

const str = (v, max = 500) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

const parseNumber = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const num = Number.parseFloat(String(val).replace(",", "."));
  return Number.isFinite(num) && num >= 0 ? num : null;
};

const parseIntSafe = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const num = Number.parseInt(val, 10);
  return Number.isFinite(num) && num >= 0 ? num : null;
};

const parseDate = (val) => {
  const s = str(val, 20);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

export default function makeSupplierRouter({ supabase, randomBytes, requireAuth }) {
  const router = express.Router();

  // Create (or return the existing) public supplier link for a briefing.
  // Pass { regenerate: true } to invalidate the old link on purpose.
  router.post(
    "/generate-supplier-link",
    requireAuth,
    asyncRoute(async (req, res) => {
      const { briefingId, regenerate } = req.body || {};
      const briefing = await getOwnedBriefing(supabase, briefingId, req.user.id, "id, supplier_link_token");

      let token = briefing.supplier_link_token;
      if (!token || regenerate) {
        token = randomBytes(32).toString("hex");
        const { error } = await supabase
          .from("briefings")
          .update({ supplier_link_token: token })
          .eq("id", briefing.id);
        if (error) throw new HttpError(500, `Failed to save link: ${error.message}`);
        console.log("🎫 New supplier link token for briefing", briefing.id);
      }

      const frontend = (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim().replace(/\/+$/, "");
      res.json({ token, supplierLink: `${frontend}/supplier-response/${token}`, briefingId: briefing.id });
    }),
  );

  // Public: briefing summary for suppliers
  router.get(
    "/supplier-briefing/:token",
    asyncRoute(async (req, res) => {
      const { token } = req.params;
      if (!TOKEN_RE.test(token)) throw new HttpError(404, "Invalid or expired link");

      const { data, error } = await supabase
        .from("briefings")
        .select("id, title, chat, created_at")
        .eq("supplier_link_token", token)
        .maybeSingle();

      if (error || !data) throw new HttpError(404, "Invalid or expired link");

      const chat = Array.isArray(data.chat) ? data.chat : [];
      const description = chat.find((m) => m.role === "User")?.content || "No description available";

      res.json({
        id: data.id,
        title: data.title || "Quote Request",
        description,
        created_at: data.created_at,
      });
    }),
  );

  const submitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    keyFn: (req) => req.ip,
    message: "Too many submissions from this network. Try again later.",
  });

  // Public: supplier submits a quote via the link
  router.post(
    "/supplier-submit-quote",
    submitLimiter,
    asyncRoute(async (req, res) => {
      const { token, quoteData } = req.body || {};
      if (!token || !TOKEN_RE.test(token) || !quoteData || typeof quoteData !== "object") {
        throw new HttpError(400, "Token and quote data required");
      }

      const supplierName = str(quoteData.supplier_name, 200);
      const totalPrice = parseNumber(quoteData.total_price);
      if (!supplierName) throw new HttpError(400, "Supplier name is required");
      if (totalPrice === null) throw new HttpError(400, "A valid total price is required");

      const { data: briefing, error: briefingError } = await supabase
        .from("briefings")
        .select("id")
        .eq("supplier_link_token", token)
        .maybeSingle();
      if (briefingError || !briefing) throw new HttpError(404, "Invalid or expired link");

      const row = {
        briefing_id: briefing.id,
        supplier_name: supplierName,
        contact_email: str(quoteData.contact_email, 200),
        contact_phone: str(quoteData.contact_phone, 50),
        total_price: totalPrice,
        currency: (str(quoteData.currency, 3) || "USD").toUpperCase(),
        unit_price: parseNumber(quoteData.unit_price),
        quantity: parseIntSafe(quoteData.quantity),
        lead_time_days: parseIntSafe(quoteData.lead_time_days),
        delivery_date: parseDate(quoteData.delivery_date),
        payment_terms: str(quoteData.payment_terms, 500),
        warranty_period: str(quoteData.warranty_period, 200),
        warranty_months: parseIntSafe(quoteData.warranty_months),
        shipping_cost: parseNumber(quoteData.shipping_cost),
        notes: str(quoteData.notes, 5000),
        input_method: "manual_supplier",
        submitted_by: "supplier",
      };
      // Store only the sanitised fields, not arbitrary client JSON
      row.analysis_json = { ...row };
      delete row.analysis_json.briefing_id;

      const { data: inserted, error: insertError } = await supabase
        .from("quotes")
        .insert(row)
        .select("id")
        .single();
      if (insertError) throw new HttpError(500, `Failed to submit quote: ${insertError.message}`);

      console.log("✅ Supplier quote submitted:", inserted.id);
      res.json({ success: true, message: "Quote submitted successfully", quoteId: inserted.id });
    }),
  );

  return router;
}
