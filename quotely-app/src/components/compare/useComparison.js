// Quotes for a briefing, standardised into one currency and ranked by the
// chosen priorities (preset or custom weights, remembered per briefing).

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient.js";
import useRates from "./useRates.js";
import { standardizeAll, defaultCurrency } from "./standardize.js";
import { availableParameters, scoreQuotes, presetWeights, PRESETS } from "./scoring.js";

const storageKey = (briefingId) => `quotely_ranking_${briefingId}`;

function loadRanking(briefingId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(briefingId)) || "null") || { preset: "balanced", custom: null };
  } catch {
    return { preset: "balanced", custom: null };
  }
}

export default function useComparison(briefingId) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currency, setCurrency] = useState(null); // null = automatic
  const [ranking, setRankingState] = useState(() => loadRanking(briefingId));
  const rates = useRates();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("quotes")
      .select("*, briefings(title)")
      .eq("briefing_id", briefingId)
      .order("created_at", { ascending: true });
    if (err) setError(err.message);
    else setQuotes(data || []);
    setLoading(false);
  }, [briefingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setRanking = useCallback(
    (next) => {
      setRankingState(next);
      try {
        localStorage.setItem(storageKey(briefingId), JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
    },
    [briefingId],
  );

  const target = currency || defaultCurrency(quotes);
  const standardized = useMemo(() => standardizeAll(quotes, rates, target), [quotes, rates, target]);
  const params = useMemo(() => availableParameters(standardized), [standardized]);
  const weights = ranking.preset === "custom" && ranking.custom ? ranking.custom : presetWeights(ranking.preset === "custom" ? "balanced" : ranking.preset, params);
  const ranked = useMemo(() => scoreQuotes(standardized, weights, params), [standardized, weights, params]);
  const currencies = useMemo(() => [...new Set(["EUR", "USD", "GBP", ...quotes.map((q) => q.currency?.toUpperCase()).filter(Boolean)])], [quotes]);

  return {
    quotes: standardized,
    ranked,
    params,
    weights,
    ranking,
    setRanking,
    presetLabel: ranking.preset === "custom" ? "custom priorities" : PRESETS[ranking.preset]?.label.toLowerCase(),
    currency: target,
    setCurrency,
    currencies,
    ratesDate: rates?.date || null,
    loading,
    error,
    refresh,
  };
}
