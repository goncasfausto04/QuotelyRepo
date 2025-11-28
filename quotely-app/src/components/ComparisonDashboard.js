import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Award,
  Star,
  AlertCircle,
  BarChart3,
  Crown,
  Trophy,
  Settings,
  Download,
} from "lucide-react";
import WeightConfiguration from "./WeightConfiguration.js";
import { generateQuotesPDF } from "./QuotePDFReport.js";

export default function ComparisonDashboard({ briefingId }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userWeights, setUserWeights] = useState(null);
  const [showWeightConfig, setShowWeightConfig] = useState(false);
  const [scoredQuotes, setScoredQuotes] = useState([]);
  const [showOnlyComplete, setShowOnlyComplete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState({});

  // Fetch quotes from database
  const fetchQuotes = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("quotes")
        .select("*, briefings(title)")
        .order("created_at", { ascending: false });

      if (briefingId) query = query.eq("briefing_id", briefingId);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setQuotes(data || []);
    } catch (err) {
      console.error("Error fetching quotes:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [briefingId]);

  const allowedParameters = {
    total_price: { name: "Total Price", direction: "lower" },
    lead_time_days: { name: "Lead Time", direction: "lower" },
    warranty_months: { name: "Warranty", direction: "higher" },
    shipping_cost: { name: "Shipping Cost", direction: "lower" },
  };

  const getAvailableParameters = () => {
    if (!quotes.length) return [];
    const paramCounts = {};
    quotes.forEach((q) =>
      Object.keys(allowedParameters).forEach((k) => {
        const v = q[k];
        if (v != null && v !== "" && !isNaN(v)) paramCounts[k] = (paramCounts[k] || 0) + 1;
      })
    );
    return Object.keys(allowedParameters)
      .filter((k) => (paramCounts[k] || 0) >= 2)
      .map((k) => ({ key: k, ...allowedParameters[k], count: paramCounts[k] || 0 }));
  };

  const calculateScores = (weights) => {
    if (!weights || Object.keys(weights).length === 0) return quotes;
    const params = getAvailableParameters();
    const scored = quotes
      .map((quote) => {
        const parameterScores = {};
        const enabled = params.filter((p) => weights[p.key]?.enabled && weights[p.key].weight > 0);
        if (enabled.length === 0) return { ...quote, score: 0, parameterScores: {} };

        enabled.forEach((p) => {
          const cfg = weights[p.key];
          const value = quote[p.key];
          if (value == null || isNaN(value)) return;
          const allValues = quotes.map((q) => q[p.key]).filter((v) => v != null && !isNaN(v)).sort((a,b)=>a-b);
          if (!allValues.length) return;
          const min = allValues[0], max = allValues[allValues.length - 1];
          let normalized = 1;
          if (min !== max) {
            if (cfg.direction === "higher") normalized = (value - min) / (max - min);
            else normalized = (max - value) / (max - min);
          }
          parameterScores[p.key] = {
            originalValue: value,
            normalizedScore: normalized,
            weight: cfg.weight,
            rawContribution: normalized * cfg.weight,
          };
        });

        const totalRaw = Object.values(parameterScores).reduce((s, v) => s + (v.rawContribution || 0), 0);
        const totalPossible = Object.values(parameterScores).reduce((s, v) => s + (v.weight || 0), 0);
        const score = totalPossible > 0 ? (totalRaw / totalPossible) * 100 : 0;

        return { ...quote, score, parameterScores, enabledParamCount: Object.keys(parameterScores).length };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    return scored;
  };

  const handleWeightsApplied = (weights) => {
    setUserWeights(weights);
    const scored = calculateScores(weights);
    setScoredQuotes(scored);
    setShowWeightConfig(false);
    if (briefingId) localStorage.setItem(`quotely_weights_${briefingId}`, JSON.stringify(weights));
  };

  useEffect(() => {
    if (!briefingId) return;
    const saved = localStorage.getItem(`quotely_weights_${briefingId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUserWeights(parsed);
        setScoredQuotes(calculateScores(parsed));
      } catch (e) {
        console.warn("Failed to parse saved weights:", e);
      }
    }
  }, [briefingId]);

  const resetWeights = () => {
    setUserWeights(null);
    setScoredQuotes([]);
    if (briefingId) localStorage.removeItem(`quotely_weights_${briefingId}`);
  };

  const bestPrice = (() => {
    const valid = quotes.filter((q) => q.total_price != null && !isNaN(q.total_price));
    if (!valid.length) return null;
    const min = Math.min(...valid.map((q) => q.total_price));
    const q = valid.find((x) => x.total_price === min);
    return { value: min, supplier: q?.supplier_name || "Unknown", currency: q?.currency || "USD", quote: q };
  })();

  const bestLead = (() => {
    const valid = quotes.filter((q) => q.lead_time_days != null && !isNaN(q.lead_time_days));
    if (!valid.length) return null;
    const min = Math.min(...valid.map((q) => q.lead_time_days));
    const q = valid.find((x) => x.lead_time_days === min);
    return { value: min, supplier: q?.supplier_name || "Unknown", quote: q };
  })();

  const bestOverall = scoredQuotes.length ? scoredQuotes[0] : null;
  const averagePrice = (() => {
    const valid = quotes.filter((q) => q.total_price != null && !isNaN(q.total_price));
    if (!valid.length) return 0;
    return valid.reduce((s, q) => s + q.total_price, 0) / valid.length;
  })();

  const availableParams = getAvailableParameters();
  const displayQuotes = scoredQuotes.length ? scoredQuotes : quotes;
  const filteredQuotes = displayQuotes.filter((q) => !showOnlyComplete || (q.warranty_months != null && q.lead_time_days != null));

  const toggleDetails = (id) => setDetailsOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="max-w-6xl mx-auto p-6"><div className="bg-red-50 rounded-lg p-4">Error Loading Quotes: {error}</div></div>;
  if (!quotes.length) return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <h3 className="text-xl font-semibold mb-2">No Quotes Yet</h3>
        <p className="text-gray-600 mb-6">{briefingId ? "No quotes have been analyzed for this briefing yet." : "Start analyzing supplier quotes to see comparisons here."}</p>
        <button onClick={() => (window.location.href = "/analyze")} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Analyze Your First Quote</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow p-6 border">
        <div className="flex flex-col lg:flex-row lg:justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-3"><BarChart3 className="text-white" size={28} /></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Quote Analysis</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">{quotes.length} {quotes.length === 1 ? "Quote" : "Quotes"}</span>
                  {userWeights && <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">🎯 Personalized</span>}
                </div>
              </div>
            </div>
            <p className="text-lg text-gray-600">{briefingId && quotes[0]?.briefings?.title ? `Analyzing quotes for "${quotes[0].briefings.title}"` : "Smart comparison of all your supplier quotes with personalized scoring"}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => generateQuotesPDF(displayQuotes, quotes[0]?.briefings?.title, userWeights, availableParams)} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl">
              <Download size={16} /> Download PDF
            </button>
            {userWeights && <button onClick={resetWeights} className="px-4 py-2 bg-white border rounded-xl">Reset Priorities</button>}
            <button onClick={() => setShowWeightConfig(!showWeightConfig)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">{userWeights ? "Adjust Priorities" : "Set Priorities"}</button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-emerald-50 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-bold uppercase">Best Price</p>
                <p className="text-2xl font-bold mt-2">{bestPrice ? `${bestPrice.currency} ${bestPrice.value.toLocaleString()}` : "—"}</p>
                <p className="text-sm mt-1">{bestPrice?.supplier || "No data"}</p>
              </div>
              <Trophy className="text-white bg-emerald-600 rounded-xl p-2" size={34} />
            </div>
          </div>

          <div className="p-6 bg-purple-50 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-bold uppercase">{userWeights ? "🎯 Best Match" : "Smart Ranking"}</p>
                <p className="text-2xl font-bold mt-2">{userWeights && bestOverall ? `${Math.round(bestOverall.score)}%` : "—"}</p>
                <p className="text-sm mt-1">{bestOverall?.supplier_name || "No data"}</p>
              </div>
              <Crown className="text-white bg-purple-600 rounded-xl p-2" size={34} />
            </div>
          </div>

          <div className="p-6 bg-blue-50 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-bold uppercase">Best Lead Time</p>
                <p className="text-2xl font-bold mt-2">{bestLead ? `${bestLead.value} days` : "—"}</p>
                <p className="text-sm mt-1">{bestLead?.supplier || "No data"}</p>
              </div>
              <Award className="text-white bg-blue-600 rounded-xl p-2" size={34} />
            </div>
          </div>
        </div>
      </div>

      {/* Weight configuration */}
      {showWeightConfig && <WeightConfiguration initialWeights={userWeights} onApply={handleWeightsApplied} onCancel={() => setShowWeightConfig(false)} />}

      {/* Quotes list */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Analyzed Quotes ({filteredQuotes.length})</h3>
          <div className="flex items-center gap-3">
            <label className="text-sm">Show only complete</label>
            <input type="checkbox" checked={showOnlyComplete} onChange={(e)=>setShowOnlyComplete(e.target.checked)} />
          </div>
        </div>

        <div className="divide-y">
          {filteredQuotes.map((q) => (
            <div key={q.id} className="p-4 flex flex-col md:flex-row md:justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-medium">{q.supplier_name || "Unknown Supplier"}</h4>
                    <p className="text-sm text-gray-500">{q.contact_email || "No contact"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{q.total_price ? `${q.currency || "USD"} ${Number(q.total_price).toLocaleString()}` : "—"}</p>
                    <p className="text-sm text-gray-500">{q.lead_time_days ? `${q.lead_time_days} days` : "—"}</p>
                  </div>
                </div>

                {detailsOpen[q.id] && (
                  <div className="mt-3 text-sm text-gray-700">
                    <pre className="whitespace-pre-wrap">{q.raw_email_text || q.analysis_json && JSON.stringify(q.analysis_json, null, 2) || "No details"}</pre>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-xs text-gray-500">Input: {q.input_method}</div>
                <div className="text-sm font-medium">{q.score ? `${Math.round(q.score)}%` : "—"}</div>
                <button onClick={()=>toggleDetails(q.id)} className="text-sm text-blue-600">{detailsOpen[q.id] ? "Hide" : "Details"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
