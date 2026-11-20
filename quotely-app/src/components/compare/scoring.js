// Pure comparison logic: which criteria can be scored, weighted scores, bests.

// Criteria a quote can be ranked on. getter reads the value from a quote row.
export const CRITERIA = {
  total_price: { name: "Total Price", direction: "lower", description: "Total cost including all charges", getter: (q) => q.total_price },
  lead_time_days: { name: "Lead Time", direction: "lower", description: "Days until delivery", getter: (q) => q.lead_time_days },
  warranty_months: { name: "Warranty", direction: "higher", description: "Warranty duration in months", getter: (q) => q.warranty_months },
  shipping_cost: { name: "Shipping Cost", direction: "lower", description: "Additional shipping charges", getter: (q) => q.shipping_cost },
  business_rating_value: {
    name: "Business Rating",
    direction: "higher",
    description: "Average customer rating (higher is better)",
    getter: (q) => q?.analysis_json?.business_rating_value,
  },
};

const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

// Criteria with a numeric value in at least two quotes (otherwise nothing to compare)
export function availableParameters(quotes) {
  return Object.entries(CRITERIA)
    .map(([key, c]) => ({ key, ...c, count: quotes.filter((q) => num(c.getter(q)) != null).length }))
    .filter((p) => p.count >= 2)
    .sort((a, b) => b.count - a.count);
}

// Min-max normalise each enabled criterion, weight it, and rank (0-100)
export function scoreQuotes(quotes, weights, params) {
  if (!weights || !Object.keys(weights).length) return quotes;
  const enabled = params.filter((p) => weights[p.key]?.enabled && weights[p.key].weight > 0);

  const ranges = Object.fromEntries(
    enabled.map((p) => {
      const values = quotes.map((q) => num(p.getter(q))).filter((v) => v != null);
      return [p.key, { min: Math.min(...values), max: Math.max(...values) }];
    }),
  );

  return quotes
    .map((quote) => {
      const parameterScores = {};
      for (const p of enabled) {
        const value = num(p.getter(quote));
        if (value == null) continue;
        const { min, max } = ranges[p.key];
        const { weight, direction } = weights[p.key];
        const normalizedScore = min === max ? 1 : direction === "higher" ? (value - min) / (max - min) : (max - value) / (max - min);
        parameterScores[p.key] = { originalValue: value, normalizedScore, weight, rawContribution: normalizedScore * weight, min, max, direction };
      }
      const scores = Object.values(parameterScores);
      const rawWeightedSum = scores.reduce((s, x) => s + x.rawContribution, 0);
      const totalWeights = scores.reduce((s, x) => s + x.weight, 0);
      for (const s of scores) s.contribution = rawWeightedSum > 0 ? (s.rawContribution / rawWeightedSum) * 100 : 0;
      return {
        ...quote,
        score: totalWeights > 0 ? (rawWeightedSum / totalWeights) * 100 : 0,
        parameterScores,
        enabledParamCount: enabled.length,
        rawWeightedSum,
        totalWeights,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function bestBy(quotes, key) {
  const valid = quotes.filter((q) => num(q[key]) != null && Number(q[key]) > 0);
  if (!valid.length) return null;
  const best = valid.reduce((a, b) => (Number(b[key]) < Number(a[key]) ? b : a));
  return { value: Number(best[key]), supplier: best.supplier_name || "Unknown", currency: best.currency || "", quote: best };
}

export const bestPrice = (quotes) => bestBy(quotes, "total_price");
export const bestLeadTime = (quotes) => bestBy(quotes, "lead_time_days");

export function averagePrice(quotes) {
  const prices = quotes.map((q) => num(q.total_price)).filter((v) => v != null && v > 0);
  return prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
}

export function formatBusinessRating(quote) {
  const aj = quote?.analysis_json || {};
  if (!aj.business_rating_value) return null;
  const parts = [`${aj.business_rating_value}/${aj.business_rating_scale || 5}`];
  if (aj.business_reviews_count) parts.push(`${aj.business_reviews_count} reviews`);
  if (aj.business_rating_source) parts.push(aj.business_rating_source);
  return { text: parts.join(" • "), url: aj.business_profile_url || null };
}

export const money = (amount, currency) => (amount == null || amount === "" ? "—" : `${currency ? `${currency} ` : ""}${Number(amount).toLocaleString()}`);

export const INPUT_METHOD_LABELS = {
  email: "📧 Email",
  pdf: "📄 PDF",
  manual_user: "✍️ Manual",
  manual_supplier: "🔗 Supplier form",
};
