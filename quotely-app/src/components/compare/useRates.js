// Daily exchange rates (European Central Bank via frankfurter.dev, no key).
// Cached for the session; falls back to "no conversion" if offline.

import { useEffect, useState } from "react";

const CACHE_KEY = "quotely_fx_rates";

export default function useRates() {
  const [rates, setRates] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (rates) return;
    fetch("https://api.frankfurter.dev/v1/latest?base=EUR")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.rates) return;
        const next = { EUR: 1, ...data.rates, date: data.date };
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          /* storage blocked */
        }
        setRates(next);
      })
      .catch(() => {});
  }, [rates]);

  return rates;
}
