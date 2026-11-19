import express from "express";
import { generateJson, aiErrorMessage } from "../lib/ai.js";
import { getOwnedBriefing, asyncRoute, rateLimit, HttpError } from "../lib/auth.js";

const MAX_EMAIL_CHARS = 100_000;

const OUTPUT_SCHEMA = `{
  "supplier_name": "string or null",
  "contact_email": "string or null",
  "contact_phone": "string or null",
  "total_price": number or null,
  "currency": "ISO 4217 code string or null",
  "unit_price": number or null,
  "quantity": number or null,
  "lead_time_days": number or null,
  "delivery_date": "YYYY-MM-DD or null",
  "materials_included": ["array of strings"],
  "specifications": ["array of key specs mentioned"],
  "payment_terms": "string or null",
  "warranty_period": "string or null",
  "warranty_months": number or null,
  "shipping_cost": number or null,
  "additional_fees": [{"description": "string", "amount": number}],
  "certifications": ["array of certifications mentioned"],
  "business_rating_value": number or null,
  "business_rating_scale": number or null,
  "business_reviews_count": number or null,
  "business_rating_source": "string or null",
  "business_profile_url": "string or null",
  "notes": "string with any additional relevant observations"
}`;

const extractionPrompt = (sourceLabel) => `You are a data extraction assistant. Extract factual information from this quote ${sourceLabel}. Do NOT provide subjective opinions.

Return a single JSON object with exactly this shape:
${OUTPUT_SCHEMA}

EXTRACTION RULES:
1. Extract ONLY factual data present in the ${sourceLabel}
2. Do NOT make assumptions, do NOT research externally
3. If a business rating (e.g., 4.7/5, 120 reviews, Trustpilot) is explicitly present, extract it into the rating fields. Otherwise use null.
4. Convert time periods to days (e.g., "2 weeks" = 14)
5. Convert warranty to months (e.g., "12 months" = 12, "1 year" = 12)
6. Numbers must be plain numbers without currency symbols or thousands separators
7. If information is not explicitly stated, use null`;

const NUMERIC_FIELDS = [
  "total_price",
  "unit_price",
  "quantity",
  "lead_time_days",
  "warranty_months",
  "shipping_cost",
  "business_rating_value",
  "business_rating_scale",
  "business_reviews_count",
];

// Make sure numeric fields really are numbers (models sometimes return "1,200.00")
function normalizeAnalysis(raw) {
  const a = raw && typeof raw === "object" && !Array.isArray(raw) ? { ...raw } : {};
  for (const key of NUMERIC_FIELDS) {
    const v = a[key];
    if (v === undefined || v === null || v === "") {
      a[key] = null;
    } else if (typeof v !== "number") {
      const n = Number.parseFloat(String(v).replace(/[^\d.-]/g, ""));
      a[key] = Number.isFinite(n) ? n : null;
    }
  }
  for (const key of ["quantity", "lead_time_days", "warranty_months", "business_reviews_count", "business_rating_scale"]) {
    if (a[key] !== null) a[key] = Math.round(a[key]);
  }
  if (a.delivery_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(a.delivery_date))) a.delivery_date = null;
  if (typeof a.currency === "string") a.currency = a.currency.trim().toUpperCase().slice(0, 3) || null;
  return a;
}

// Extract explicit business ratings from raw text (no external inference)
function extractRatings(text) {
  if (!text || typeof text !== "string") return null;
  const t = text.replace(/\s+/g, " ");
  const ratingMatch = t.match(/(\d(?:\.\d)?)\s*(?:\/|out of)\s*(5|10)\b/i);
  const reviewsMatch = t.match(/(\d{1,6})\s*reviews/i);
  const sourceMatch = t.match(/(Trustpilot|Google\s*Reviews|Yelp|G2|Capterra|Facebook\s*Reviews)/i);
  const urlMatch = t.match(
    /https?:\/\/(?:www\.)?(trustpilot\.com|google\.com\/maps|yelp\.com|g2\.com|capterra\.com)[^\s)]+/i,
  );
  if (!ratingMatch && !reviewsMatch && !sourceMatch && !urlMatch) return null;
  return {
    business_rating_value: ratingMatch ? parseFloat(ratingMatch[1]) : null,
    business_rating_scale: ratingMatch ? parseInt(ratingMatch[2], 10) : null,
    business_reviews_count: reviewsMatch ? parseInt(reviewsMatch[1], 10) : null,
    business_rating_source: sourceMatch ? sourceMatch[1] : null,
    business_profile_url: urlMatch ? urlMatch[0] : null,
  };
}

export default function makeAnalyzeRouter({ ai, supabase, upload, requireAuth }) {
  const router = express.Router();

  const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    keyFn: (req) => req.user.id,
    message: "AI analysis limit reached (60 per hour). Try again later.",
  });

  router.post(
    "/analyze-email",
    requireAuth,
    aiLimiter,
    asyncRoute(async (req, res) => {
      const { emailText } = req.body || {};
      if (typeof emailText !== "string" || !emailText.trim()) throw new HttpError(400, "No email text provided");
      if (emailText.length > MAX_EMAIL_CHARS) throw new HttpError(413, "Email is too long to analyze");

      console.log(`📧 Email analysis requested (${emailText.length} chars)`);

      let analysis;
      try {
        analysis = normalizeAnalysis(
          await generateJson(ai, `${extractionPrompt("email")}\n\nEMAIL TO ANALYZE:\n"""\n${emailText}\n"""`),
        );
      } catch (err) {
        console.error("❌ Email analysis failed:", err.message);
        throw new HttpError(502, aiErrorMessage(err, "Failed to analyze email"));
      }

      const ratings = extractRatings(emailText);
      if (ratings) {
        for (const [k, v] of Object.entries(ratings)) analysis[k] = analysis[k] ?? v;
      }

      console.log("✅ Email analysis completed");
      // Kept as a JSON string for backwards compatibility with the frontend
      res.json({ analysis: JSON.stringify(analysis) });
    }),
  );

  // Wrap multer so upload errors (too big, etc.) return clean JSON
  const singlePdf = (req, res, next) =>
    upload.single("pdfFile")(req, res, (err) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") return next(new HttpError(413, "PDF must be 10MB or smaller"));
      next(new HttpError(400, err.message));
    });

  router.post(
    "/analyze-pdf",
    requireAuth,
    aiLimiter,
    singlePdf,
    asyncRoute(async (req, res) => {
      if (!req.file) throw new HttpError(400, "No PDF file uploaded");

      const isPdf =
        req.file.mimetype === "application/pdf" && req.file.buffer.subarray(0, 5).toString("latin1") === "%PDF-";
      if (!isPdf) throw new HttpError(400, "File must be a PDF");

      const briefing = await getOwnedBriefing(supabase, req.body?.briefingId, req.user.id);
      console.log(`📄 PDF analysis: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

      let analysis;
      try {
        analysis = normalizeAnalysis(
          await generateJson(
            ai,
            [
              { inlineData: { mimeType: "application/pdf", data: req.file.buffer.toString("base64") } },
              { text: extractionPrompt("PDF") },
            ],
            { retries: 4, baseDelay: 2000 },
          ),
        );
      } catch (err) {
        console.error("❌ PDF analysis failed:", err.message);
        throw new HttpError(502, aiErrorMessage(err, "Failed to analyze PDF"));
      }

      // Store the PDF (non-critical)
      let pdfUrl = null;
      try {
        const safeName = req.file.originalname.replace(/[^\w.-]+/g, "_").slice(-100) || "quote.pdf";
        const fileName = `${briefing.id}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("quote-pdfs")
          .upload(fileName, req.file.buffer, { contentType: "application/pdf" });
        if (uploadError) {
          console.warn("⚠️  PDF storage upload error:", uploadError.message);
        } else {
          pdfUrl = supabase.storage.from("quote-pdfs").getPublicUrl(fileName).data.publicUrl;
        }
      } catch (storageError) {
        console.warn("⚠️  PDF storage failed (non-critical):", storageError.message);
      }

      console.log("✅ PDF analysis completed");
      res.json({ analysis: JSON.stringify(analysis), pdfUrl });
    }),
  );

  return router;
}
