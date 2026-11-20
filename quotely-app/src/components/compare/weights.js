// Priority weights: { [criterionKey]: { enabled, weight (0-5), direction } }

export const defaultWeights = (params) =>
  Object.fromEntries(params.map((p) => [p.key, { enabled: true, weight: 1, direction: p.direction }]));

// Saved weights + defaults for new criteria. Old 0-100 weights become 0-5.
export function initialWeights(params, saved) {
  const result = defaultWeights(params);
  for (const [key, cfg] of Object.entries(saved || {})) {
    if (!result[key]) continue;
    const w = cfg.weight > 5 ? Math.round((cfg.weight / 100) * 10) / 2 : cfg.weight;
    result[key] = { ...result[key], enabled: !!cfg.enabled, weight: Math.max(0, Math.min(5, Number(w) || 0)) };
  }
  return result;
}

export const setAllWeights = (weights, value) =>
  Object.fromEntries(Object.entries(weights).map(([k, cfg]) => [k, cfg.enabled ? { ...cfg, weight: value } : cfg]));
