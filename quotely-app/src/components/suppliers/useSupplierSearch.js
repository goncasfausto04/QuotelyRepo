import { useCallback, useEffect, useState } from "react";
import { loadSavedSuppliers, searchSuppliers } from "./suppliersApi.js";

export default function useSupplierSearch(briefingId) {
  const [result, setResult] = useState({ suppliers: [], center: null, location: "" });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!briefingId) return;
    loadSavedSuppliers(briefingId)
      .then(setResult)
      .finally(() => setLoading(false));
  }, [briefingId]);

  const search = useCallback(
    async (location) => {
      setSearching(true);
      setError(null);
      try {
        setResult(await searchSuppliers(briefingId, location));
      } catch (err) {
        setError(err.message || "Search failed");
      } finally {
        setSearching(false);
      }
    },
    [briefingId],
  );

  return { ...result, loading, searching, error, search };
}
