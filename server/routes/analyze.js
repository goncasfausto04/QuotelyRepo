// Quote analysis: supplier email text or PDF -> structured quote (AI).

import express from "express";
import { generateJson, aiErrorMessage } from "../lib/ai.js";
import { getOwnedBriefing } from "../lib/auth.js";
import { HttpError, asyncRoute } from "../lib/http.js";
import { rateLimit } from "../lib/rateLimit.js";
import { quoteExtractionPrompt } from "../prompts/analysis.js";
import { normalizeAnalysis, withRatings } from "../services/quoteAnalysis.js";

const MAX_EMAIL_CHARS = 100_000;

async function storePdf(supabase, briefingId, file) {
  try {
    const safeName = file.originalname.replace(/[^\w.-]+/g, "_").slice(-100) || "quote.pdf";
    const path = `${briefingId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from("quote-pdfs").upload(path, file.buffer, { contentType: "application/pdf" });
    if (error) throw error;
    return supabase.storage.from("quote-pdfs").getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.warn("⚠️  PDF storage failed (non-critical):", err.message);
    return null;
  }
}

export default function makeAnalyzeRouter({ ai, supabase, upload, requireAuth }) {
  const router = express.Router();
  const aiLimiter = rateLimit({ max: 60, message: "AI analysis limit reached (60 per hour). Try again later." });

  // Wrap multer so upload errors (too big, etc.) return clean JSON
  const singlePdf = (req, res, next) =>
    upload.single("pdfFile")(req, res, (err) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") return next(new HttpError(413, "PDF must be 10MB or smaller"));
      next(new HttpError(400, err.message));
    });

  const analyze = async (contents, fallback, opts) => {
    try {
      return normalizeAnalysis(await generateJson(ai, contents, opts));
    } catch (err) {
      console.error(`❌ ${fallback}:`, err.message);
      throw new HttpError(502, aiErrorMessage(err, fallback));
    }
  };

  router.post(
    "/analyze-email",
    requireAuth,
    aiLimiter,
    asyncRoute(async (req, res) => {
      const { emailText } = req.body || {};
      if (typeof emailText !== "string" || !emailText.trim()) throw new HttpError(400, "No email text provided");
      if (emailText.length > MAX_EMAIL_CHARS) throw new HttpError(413, "Email is too long to analyze");

      const analysis = await analyze(
        `${quoteExtractionPrompt("email")}\n\nEMAIL TO ANALYZE:\n"""\n${emailText}\n"""`,
        "Failed to analyze email",
      );
      // Kept as a JSON string for backwards compatibility with the frontend
      res.json({ analysis: JSON.stringify(withRatings(analysis, emailText)) });
    }),
  );

  router.post(
    "/analyze-pdf",
    requireAuth,
    aiLimiter,
    singlePdf,
    asyncRoute(async (req, res) => {
      if (!req.file) throw new HttpError(400, "No PDF file uploaded");
      const isPdf = req.file.mimetype === "application/pdf" && req.file.buffer.subarray(0, 5).toString("latin1") === "%PDF-";
      if (!isPdf) throw new HttpError(400, "File must be a PDF");

      const briefing = await getOwnedBriefing(supabase, req.body?.briefingId, req.user.id);
      const analysis = await analyze(
        [
          { inlineData: { mimeType: "application/pdf", data: req.file.buffer.toString("base64") } },
          { text: quoteExtractionPrompt("PDF") },
        ],
        "Failed to analyze PDF",
        { retries: 4, baseDelay: 2000 },
      );
      const pdfUrl = await storePdf(supabase, briefing.id, req.file);
      res.json({ analysis: JSON.stringify(analysis), pdfUrl });
    }),
  );

  return router;
}
