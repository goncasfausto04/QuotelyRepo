// Quotes for a briefing + user priority weights (remembered per briefing).

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient.js";
import { availableParameters, scoreQuotes } from "./scoring.js";

const storageKey = (briefingId) => `quotely_weights_${briefingId}`;

function loadWeights(briefingId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(briefingId)) || "null");
  } catch {
    return null;
  }
}

export default function useComparison(briefingId) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weights, setWeightsState] = useState(() => loadWeights(briefingId));

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase.from("quotes").select("*, briefings(title)").order("created_at", { ascending: false });
    if (briefingId) query = query.eq("briefing_id", briefingId);
    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setQuotes(data || []);
    setLoading(false);
  }, [briefingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setWeights = useCallback(
    (w) => {
      setWeightsState(w);
      if (w) localStorage.setItem(storageKey(briefingId), JSON.stringify(w));
      else localStorage.removeItem(storageKey(briefingId));
    },
    [briefingId],
  );

  const params = useMemo(() => availableParameters(quotes), [quotes]);
  const ranked = useMemo(() => (weights ? scoreQuotes(quotes, weights, params) : quotes), [quotes, weights, params]);

  return { quotes, ranked, params, weights, setWeights, loading, error, refresh };
}
