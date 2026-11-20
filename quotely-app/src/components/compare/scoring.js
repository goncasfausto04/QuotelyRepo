// Ranking on standardised values (quote.std, see standardize.js).

// Criteria a quote can be ranked on
export const CRITERIA = {
  total: { name: "Total incl. shipping", direction: "lower", description: "Price plus shipping, in one currency", getter: (q) => q.std?.total },
  leadDays: { name: "Delivery time", direction: "lower", description: "Days until delivery", getter: (q) => q.std?.leadDays },
  warrantyMonths: { name: "Warranty", direction: "higher", description: "Warranty in months", getter: (q) => q.std?.warrantyMonths },
  rating: { name: "Supplier rating", direction: "higher", description: "Public rating, scaled to 5", getter: (q) => q.std?.rating },
};

// Ready-made priorities (weights 0-5)
export const PRESETS = {
  balanced: { label: "Balanced", weights: { total: 3, leadDays: 2, warrantyMonths: 1, rating: 1 } },
  cheapest: { label: "Lowest cost", weights: { total: 5, leadDays: 1 } },
  fastest: { label: "Fastest", weights: { leadDays: 5, total: 1 } },
};

const num = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));

// Criteria with a value in at least two quotes (otherwise nothing to compare)
export function availableParameters(quotes) {
  return Object.entries(CRITERIA)
    .map(([key, c]) => ({ key, ...c, count: quotes.filter((q) => num(c.getter(q)) != null).length }))
    .filter((p) => p.count >= 2);
}

export function presetWeights(presetId, params) {
  const w = PRESETS[presetId]?.weights || {};
  return Object.fromEntries(params.map((p) => [p.key, { enabled: (w[p.key] || 0) > 0, weight: w[p.key] || 0, direction: p.direction }]));
}

// Min-max normalise each criterion (best = 1, worst = 0), weight, rank 0-100
export function scoreQuotes(quotes, weights, params) {
  const enabled = params.filter((p) => weights?.[p.key]?.enabled && weights[p.key].weight > 0);
  if (!enabled.length) return quotes;
  const ranges = Object.fromEntries(
    enabled.map((p) => {
      const values = quotes.map((q) => num(p.getter(q))).filter((v) => v != null);
      return [p.key, { min: Math.min(...values), max: Math.max(...values) }];
    }),
  );

  return quotes
    .map((quote) => {
      let sum = 0;
      let totalWeight = 0;
      const parts = {};
      for (const p of enabled) {
        const value = num(p.getter(quote));
        if (value == null) continue; // missing data neither helps nor hurts
        const { min, max } = ranges[p.key];
        const norm = min === max ? 1 : p.direction === "higher" ? (value - min) / (max - min) : (max - value) / (max - min);
        const { weight } = weights[p.key];
        parts[p.key] = norm;
        sum += norm * weight;
        totalWeight += weight;
      }
      return { ...quote, score: totalWeight ? (sum / totalWeight) * 100 : null, scoreParts: parts };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

// Best (lowest/highest) value of a row; null if fewer than 2 quotes have one
export function bestOf(values, better) {
  const present = values.filter((v) => v != null);
  if (present.length < 2) return null;
  return better === "higher" ? Math.max(...present) : Math.min(...present);
}

export const INPUT_METHOD_LABELS = {
  email: "Email",
  pdf: "PDF",
  manual_user: "Entered manually",
  manual_supplier: "Supplier form",
};

// Kept for other pages (quote lists): "EUR 1,200"
export const money = (amount, currency) => (amount == null || amount === "" ? "—" : `${currency ? `${currency} ` : ""}${Number(amount).toLocaleString()}`);

export function formatBusinessRating(quote) {
  const aj = quote?.analysis_json || {};
  if (!aj.business_rating_value) return null;
  const parts = [`${aj.business_rating_value}/${aj.business_rating_scale || 5}`];
  if (aj.business_reviews_count) parts.push(`${aj.business_reviews_count} reviews`);
  if (aj.business_rating_source) parts.push(aj.business_rating_source);
  return { text: parts.join(" · "), url: aj.business_profile_url || null };
}
