// Post-processing of AI quote extraction: numbers really are numbers, and
// explicit business ratings found in the text fill any gaps.

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
export function normalizeAnalysis(raw) {
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
export function extractRatings(text) {
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

// Ratings found literally in the text fill fields the AI left empty
export function withRatings(analysis, text) {
  const ratings = extractRatings(text);
  if (ratings) for (const [k, v] of Object.entries(ratings)) analysis[k] = analysis[k] ?? v;
  return analysis;
}
