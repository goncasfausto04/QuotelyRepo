import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient.js";
import {
  Clock,
  DollarSign,
  Award,
  Star,
  AlertCircle,
  BarChart3,
  Crown,
  Trophy,
  Zap,
  Settings,
} from "lucide-react";
import WeightConfiguration from "./WeightConfiguration.js";
import { Download } from "lucide-react"; // Add this to your imports
import { generateQuotesPDF } from "./QuotePDFReport.js"; // Import the function

export default function ComparisonDashboard({ briefingId }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userWeights, setUserWeights] = useState(null);
  const [showWeightConfig, setShowWeightConfig] = useState(false);
  const [scoredQuotes, setScoredQuotes] = useState([]);
  const [showOnlyComplete, setShowOnlyComplete] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview | calculations

  // new: API + processing state for polling supplier replies
  const API_URL = process.env.REACT_APP_API_URL;

  // extractable fetch so polling and initial load can reuse it
  const fetchQuotes = useCallback(async () => {
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
  }, [briefingId]);

  // initial load
  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Poll briefing emails, analyze new replies and insert as quotes (uses thread messages endpoint)
  useEffect(() => {
    // Disabled: the ComparisonDashboard should not trigger email analysis or insert quotes.
    // Email analysis/insertion should be performed explicitly from the Inbox UI or server-side jobs.
    // Keeping a noop effect to preserve dependency shape if needed in future.
    return () => {};
  }, [briefingId, API_URL]);

  // Get parameters that exist numerically in at least two quotes for scoring
  const getAvailableParameters = useCallback(() => {
    if (!quotes.length) return [];

    const params = [];

    // Parameter definitions with getters to support derived values from analysis_json
    const allowedParameters = {
      total_price: {
        name: "Total Price",
        direction: "lower",
        description: "Total cost including all charges",
        getter: (q) => q.total_price,
      },
      lead_time_days: {
        name: "Lead Time",
        direction: "lower",
        description: "Days until completion",
        getter: (q) => q.lead_time_days,
      },
      warranty_months: {
        name: "Warranty",
        direction: "higher",
        description: "Warranty duration in months",
        getter: (q) => q.warranty_months,
      },
      shipping_cost: {
        name: "Shipping Cost",
        direction: "lower",
        description: "Additional shipping charges",
        getter: (q) => q.shipping_cost,
      },
      business_rating_value: {
        name: "Business Rating",
        direction: "higher",
        description: "Average customer rating (higher is better)",
        getter: (q) => q?.analysis_json?.business_rating_value,
      },
    };

    const paramCounts = {};

    quotes.forEach((quote) => {
      Object.keys(allowedParameters).forEach((paramKey) => {
        const getter = allowedParameters[paramKey].getter;
        const raw = getter ? getter(quote) : quote[paramKey];
        const value = raw != null && raw !== "" ? Number(raw) : null;

        if (value != null && !Number.isNaN(value) && Number.isFinite(value)) {
          paramCounts[paramKey] = (paramCounts[paramKey] || 0) + 1;
        }
      });
    });

    Object.keys(allowedParameters).forEach((paramKey) => {
      const count = paramCounts[paramKey] || 0;
      if (count >= 2) {
        params.push({
          key: paramKey,
          name: allowedParameters[paramKey].name,
          direction: allowedParameters[paramKey].direction,
          description: allowedParameters[paramKey].description,
          getter: allowedParameters[paramKey].getter,
          count: count,
        });
      }
    });

    return params.sort((a, b) => b.count - a.count);
  }, [quotes]);

  const calculateScores = useCallback((weights) => {
    if (!weights || Object.keys(weights).length === 0) return quotes;

    const availableParams = getAvailableParameters();

    return quotes
      .map((quote) => {
        const parameterScores = {};

        const enabledParams = availableParams.filter((param) => {
          const weightConfig = weights[param.key];
          return (
            weightConfig && weightConfig.enabled && weightConfig.weight > 0
          );
        });

        if (enabledParams.length === 0)
          return { ...quote, score: 0, parameterScores: {} };

        enabledParams.forEach((param) => {
          const weightConfig = weights[param.key];
          const value = param.getter ? param.getter(quote) : quote[param.key];

          if (value == null || value === "" || isNaN(Number(value))) return;

          const allValues = quotes
            .map((q) => (param.getter ? param.getter(q) : q[param.key]))
            .filter((v) => v != null && v !== "" && !isNaN(Number(v)))
            .map((v) => Number(v))
            .sort((a, b) => a - b);

          if (allValues.length === 0) return;

          const min = allValues[0];
          const max = allValues[allValues.length - 1];

          let normalizedScore = 0;

          if (min === max) {
            normalizedScore = 1;
          } else if (weightConfig.direction === "higher") {
            normalizedScore = (value - min) / (max - min);
          } else {
            normalizedScore = (max - value) / (max - min);
          }

          parameterScores[param.key] = {
            originalValue: value,
            normalizedScore,
            weight: weightConfig.weight,
            rawContribution: normalizedScore * weightConfig.weight,
            min,
            max,
            direction: weightConfig.direction,
          };
        });

        const totalRawScore = Object.values(parameterScores).reduce(
          (sum, score) => sum + score.rawContribution,
          0,
        );
        const totalPossibleScore = Object.values(parameterScores).reduce(
          (sum, score) => sum + score.weight,
          0,
        );

        const finalScore =
          totalPossibleScore > 0
            ? (totalRawScore / totalPossibleScore) * 100
            : 0;

        Object.keys(parameterScores).forEach((key) => {
          if (totalRawScore > 0) {
            parameterScores[key].contribution =
              (parameterScores[key].rawContribution / totalRawScore) * 100;
          } else {
            parameterScores[key].contribution = 0;
          }
        });

        return {
          ...quote,
          score: finalScore,
          parameterScores,
          enabledParamCount: enabledParams.length,
          rawWeightedSum: totalRawScore,
          totalWeights: totalPossibleScore,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [quotes, getAvailableParameters]);

  const handleWeightsApplied = (weights) => {
    setUserWeights(weights);
    const scored = calculateScores(weights);
    setScoredQuotes(scored);
    setShowWeightConfig(false);

    localStorage.setItem(
      `quotely_weights_${briefingId}`,
      JSON.stringify(weights),
    );
  };

  useEffect(() => {
    if (briefingId) {
      const savedWeights = localStorage.getItem(
        `quotely_weights_${briefingId}`
      );
      if (savedWeights) {
        try {
          const parsedWeights = JSON.parse(savedWeights);
          setUserWeights(parsedWeights);
          const scored = calculateScores(parsedWeights);
          setScoredQuotes(scored);
        } catch (error) {
          console.error("Error loading saved weights:", error);
        }
      }
    }
  }, [briefingId, calculateScores]);

  const resetWeights = () => {
    setUserWeights(null);
    setScoredQuotes([]);
    if (briefingId) {
      localStorage.removeItem(`quotely_weights_${briefingId}`);
    }
  };

  // Calculate best values
  const getBestPrice = () => {
    const validQuotes = quotes.filter(
      (q) => q.total_price && !isNaN(q.total_price),
    );
    if (!validQuotes.length) return null;

    const minPrice = Math.min(...validQuotes.map((q) => q.total_price));
    const bestQuote = validQuotes.find((q) => q.total_price === minPrice);
    return {
      value: minPrice,
      supplier: bestQuote?.supplier_name || "Unknown",
      currency: bestQuote?.currency || "USD",
      quote: bestQuote,
    };
  };

  const getBestLeadTime = () => {
    const validQuotes = quotes.filter(
      (q) => q.lead_time_days && !isNaN(q.lead_time_days),
    );
    if (!validQuotes.length) return null;

    const minTime = Math.min(...validQuotes.map((q) => q.lead_time_days));
    const bestQuote = validQuotes.find((q) => q.lead_time_days === minTime);
    return {
      value: minTime,
      supplier: bestQuote?.supplier_name || "Unknown",
      quote: bestQuote,
    };
  };

  const getBestOverall = () => {
    if (scoredQuotes.length > 0) {
      const bestQuote = scoredQuotes[0];
      return {
        score: Math.round(bestQuote.score),
        supplier: bestQuote.supplier_name || "Unknown",
        quote: bestQuote,
      };
    }
    return null;
  };

  const getAveragePrice = () => {
    const validQuotes = quotes.filter(
      (q) => q.total_price && !isNaN(q.total_price),
    );
    if (!validQuotes.length) return 0;

    const sum = validQuotes.reduce((total, q) => total + q.total_price, 0);
    return sum / validQuotes.length;
  };

  const bestPrice = getBestPrice();
  const bestLeadTime = getBestLeadTime();
  const bestOverall = getBestOverall();
  const averagePrice = getAveragePrice();
  const availableParams = getAvailableParameters();
  const displayQuotes = scoredQuotes.length > 0 ? scoredQuotes : quotes;
  const filteredQuotes = displayQuotes.filter(
    (q) =>
      !showOnlyComplete ||
      (q.warranty_months != null && q.lead_time_days != null),
  );

  const copyToClipboard = (content) => {
    try {
      navigator.clipboard.writeText(content);
      alert("Copied to clipboard!");
    } catch (e) {
      console.warn("Clipboard write failed", e);
    }
  };

  // Track expanded details for mobile cards
  const [detailsOpen, setDetailsOpen] = useState({});

  const toggleDetails = (id) => {
    setDetailsOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const inputMethodLabels = {
    email: "📧 Email",
    pdf: "📄 PDF",
    manual_user: "✍️ Manual (User)",
    manual_supplier: "🔗 Supplier Link",
  };

  const formatBusinessRating = (quote) => {
    const aj = quote?.analysis_json || {};
    const value = aj.business_rating_value;
    const scale = aj.business_rating_scale || 5;
    const reviews = aj.business_reviews_count;
    const source = aj.business_rating_source;
    const url = aj.business_profile_url;
    if (!value) return null;
    const parts = [`${value}/${scale}`];
    if (reviews) parts.push(`${reviews} reviews`);
    if (source) parts.push(source);
    const text = parts.join(" • ");
    return { text, url };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle
            className="text-red-600 dark:text-red-400 mt-0.5"
            size={20}
          />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100">
              Error Loading Quotes
            </h3>
            <p className="text-red-700 dark:text-red-200 text-sm mt-1">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!quotes.length) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg
              className="mx-auto h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Quotes Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {briefingId
              ? "No quotes have been analyzed for this briefing yet."
              : "Start analyzing supplier quotes to see comparisons here."}
          </p>
          <button
            onClick={() => (window.location.href = "/analyze")}
            className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition"
          >
            Analyze Your First Quote
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-3">
                <BarChart3 className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  Quote Analysis
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-semibold">
                    {quotes.length} {quotes.length === 1 ? "Quote" : "Quotes"}
                  </span>
                  {userWeights && (
                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm font-semibold">
                      🎯 Personalized
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
              {briefingId && quotes[0]?.briefings?.title
                ? `Analyzing quotes for "${quotes[0].briefings.title}"`
                : "Smart comparison of all your supplier quotes with personalized scoring"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() =>
                generateQuotesPDF(
                  displayQuotes,
                  quotes[0]?.briefings?.title,
                  userWeights,
                  availableParams,
                )
              }
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-700 dark:to-red-700 text-white px-6 py-3 rounded-xl hover:from-orange-700 hover:to-red-700 dark:hover:from-orange-800 dark:hover:to-red-800 transition font-semibold shadow-lg transform hover:scale-105"
            >
              <Download size={20} />
              <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
            {userWeights && (
              <button
                onClick={resetWeights}
                className="px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition font-medium shadow-sm"
              >
                Reset Priorities
              </button>
            )}
            <button
              onClick={() => setShowWeightConfig(!showWeightConfig)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-800 dark:hover:to-purple-800 transition font-semibold shadow-lg transform hover:scale-105"
            >
              <Settings size={20} />
              <span className="hidden sm:inline">
                {userWeights ? "Adjust Priorities" : "Set Priorities"}
              </span>
              <span className="sm:hidden">
                {userWeights ? "Adjust" : "Configure"}
              </span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign
                    className="text-emerald-600 dark:text-emerald-400"
                    size={20}
                  />
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide">
                    Best Price
                  </p>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {bestPrice
                    ? `${
                        bestPrice.currency
                      } ${bestPrice.value.toLocaleString()}`
                    : "—"}
                </p>
                <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  {bestPrice?.supplier || "No data available"}
                </p>
                {bestPrice && averagePrice && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                    {((1 - bestPrice.value / averagePrice) * 100).toFixed(1)}%
                    below average
                  </p>
                )}
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700 rounded-2xl p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Trophy className="text-white" size={32} />
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Crown
                    className="text-purple-600 dark:text-purple-400"
                    size={20}
                  />
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wide">
                    {userWeights ? "🎯 Best Match" : "Smart Ranking"}
                  </p>
                </div>
                {userWeights && bestOverall ? (
                  <>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {bestOverall.score}%
                    </p>
                    <p className="text-purple-700 dark:text-purple-300 font-semibold text-sm">
                      {bestOverall.supplier}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                      Matches your priorities
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      —
                    </p>
                    <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">
                      Set priorities for smart ranking
                    </p>
                    <p className="text-xs text-purple-500 dark:text-purple-400 mt-2">
                      Click "Set Priorities" above
                    </p>
                  </>
                )}
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 rounded-2xl p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Star className="text-white" size={32} />
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 dark:from-sky-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6 border border-sky-200 dark:border-sky-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="text-sky-600 dark:text-sky-400" size={20} />
                  <p className="text-sm text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wide">
                    Fastest Delivery
                  </p>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {bestLeadTime ? `${bestLeadTime.value} days` : "—"}
                </p>
                <p className="text-sky-700 dark:text-sky-300 font-semibold text-sm">
                  {bestLeadTime?.supplier || "No data available"}
                </p>
                {bestLeadTime && (
                  <p className="text-xs text-sky-600 dark:text-sky-400 mt-2">
                    Ready in{" "}
                    {bestLeadTime.value < 7
                      ? "under a week"
                      : bestLeadTime.value < 30
                        ? "under a month"
                        : "over a month"}
                  </p>
                )}
              </div>
              <div className="bg-gradient-to-br from-sky-500 to-blue-600 dark:from-sky-600 dark:to-blue-700 rounded-2xl p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Zap className="text-white" size={32} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
            activeTab === "overview"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("calculations")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
            activeTab === "calculations"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
          }`}
        >
          Calculations
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Filters */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  Quote Comparison
                </h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showOnlyComplete}
                    onChange={() => setShowOnlyComplete(!showOnlyComplete)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Complete data only
                  </span>
                </label>
              </div>
            </div>

            {/* Table */}
            <div className="p-6">
              <div>
                {/* Table for md+ screens */}
                <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm table-auto border-collapse bg-white dark:bg-gray-800">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          Metric
                        </th>
                        {filteredQuotes.map((quote, index) => (
                          <th key={quote.id} className="text-center py-3 px-2">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-gray-900 dark:text-white text-xs">
                                {quote.supplier_name?.split(" ")[0] ||
                                  `S${index + 1}`}
                              </span>
                              {userWeights && quote.score && (
                                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                                  {Math.round(quote.score)}%
                                </span>
                              )}
                              <span className="text-xs italic text-gray-500">
                                {inputMethodLabels[quote.input_method] || "—"}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {activeTab === "calculations" && userWeights ? (
                        <>
                          {Object.keys(
                            getAvailableParameters().reduce((acc, p) => {
                              acc[p.key] = p;
                              return acc;
                            }, {}),
                          ).map((paramKey) => (
                            <tr
                              key={`calc-${paramKey}`}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                              <td className="py-3 font-medium text-gray-700 dark:text-gray-300 text-xs">
                                {getAvailableParameters().find(
                                  (p) => p.key === paramKey,
                                )?.name || paramKey}
                              </td>
                              {filteredQuotes.map((quote) => {
                                const ps = quote.parameterScores?.[paramKey];
                                return (
                                  <td
                                    key={`${quote.id}-${paramKey}`}
                                    className="py-3 px-2 text-center text-xs text-gray-700 dark:text-gray-300"
                                    title={
                                      ps
                                        ? `val=${ps.originalValue} | norm=${ps.normalizedScore.toFixed(2)} | weight=${ps.weight} | contrib=${ps.rawContribution.toFixed(
                                            2,
                                          )} | min=${ps.min} max=${ps.max}`
                                        : "No data"
                                    }
                                  >
                                    {ps ? (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span>{Number(ps.originalValue)}</span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                          n={ps.normalizedScore.toFixed(2)} w=
                                          {ps.weight}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                          contrib=
                                          {ps.rawContribution.toFixed(2)}
                                        </span>
                                      </div>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          <tr className="bg-gray-50 dark:bg-gray-700/40 border-t border-gray-200 dark:border-gray-600">
                            <td className="py-3 font-bold text-gray-800 dark:text-gray-200 text-xs">
                              Final Weighted Sum
                            </td>
                            {filteredQuotes.map((quote) => (
                              <td
                                key={`sum-${quote.id}`}
                                className="py-3 px-2 text-center text-xs text-gray-900 dark:text-gray-100 font-semibold"
                                title={`rawWeightedSum=${quote.rawWeightedSum?.toFixed(3) || 0} totalWeights=${quote.totalWeights || 0}`}
                              >
                                {quote.rawWeightedSum != null &&
                                quote.totalWeights > 0 ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span>
                                      {quote.rawWeightedSum.toFixed(2)}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      / {quote.totalWeights.toFixed(2)}
                                    </span>
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                      {Math.round(quote.score)}%
                                    </span>
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                            ))}
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="py-3 font-medium text-gray-700 dark:text-gray-300 text-xs">
                              Business Rating
                            </td>
                            {filteredQuotes.map((quote) => {
                              const rating = formatBusinessRating(quote);
                              return (
                                <td
                                  key={quote.id}
                                  className="py-3 px-2 text-center text-xs text-gray-700 dark:text-gray-300"
                                >
                                  {rating ? (
                                    rating.url ? (
                                      <a
                                        href={rating.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline"
                                      >
                                        {rating.text}
                                      </a>
                                    ) : (
                                      rating.text
                                    )
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="py-3 font-medium text-gray-700 dark:text-gray-300 text-xs">
                              Price
                            </td>
                            {filteredQuotes.map((quote) => (
                              <td
                                key={quote.id}
                                className="py-3 px-2 text-center font-semibold text-xs"
                              >
                                {quote.total_price
                                  ? `${quote.currency || "USD"} ${
                                      quote.total_price
                                    }`
                                  : "—"}
                              </td>
                            ))}
                          </tr>

                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="py-3 font-medium text-gray-700 dark:text-gray-300 text-xs">
                              Lead Time
                            </td>
                            {filteredQuotes.map((quote) => (
                              <td
                                key={quote.id}
                                className="py-3 px-2 text-center text-xs"
                              >
                                {quote.lead_time_days
                                  ? `${quote.lead_time_days}d`
                                  : "—"}
                              </td>
                            ))}
                          </tr>

                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="py-3 font-medium text-gray-700 dark:text-gray-300 text-xs">
                              Warranty (Months)
                            </td>
                            {filteredQuotes.map((quote) => (
                              <td
                                key={quote.id}
                                className="py-3 px-2 text-center text-xs"
                              >
                                {quote.warranty_months != null
                                  ? `${quote.warranty_months}m`
                                  : "—"}
                              </td>
                            ))}
                          </tr>

                          {/* Show warranty_period as textual info */}
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="py-3 font-medium text-gray-700 dark:text-gray-300 text-xs">
                              Warranty Details
                            </td>
                            {filteredQuotes.map((quote) => (
                              <td
                                key={quote.id}
                                className="py-3 px-2 text-center text-xs text-gray-600 dark:text-gray-400"
                                title={
                                  quote.warranty_period || "No warranty details"
                                }
                                style={{ whiteSpace: "normal" }}
                              >
                                {quote.warranty_period || "—"}
                              </td>
                            ))}
                          </tr>

                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="py-3 font-medium text-gray-700 dark:text-gray-300 text-xs">
                              Shipping Cost
                            </td>
                            {filteredQuotes.map((quote) => (
                              <td
                                key={quote.id}
                                className="py-3 px-2 text-center text-xs"
                              >
                                {quote.shipping_cost != null
                                  ? `${quote.currency || "USD"} ${
                                      quote.shipping_cost
                                    }`
                                  : "—"}
                              </td>
                            ))}
                          </tr>

                          {/* Show payment_terms (textual) */}
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="py-3 font-medium text-gray-700 dark:text-gray-300 text-xs">
                              Payment Terms
                            </td>
                            {filteredQuotes.map((quote) => (
                              <td
                                key={quote.id}
                                className="py-3 px-2 text-center text-xs text-gray-600 dark:text-gray-400"
                                title={
                                  quote.payment_terms || "No payment terms"
                                }
                                style={{ whiteSpace: "normal" }}
                              >
                                {quote.payment_terms || "—"}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: stacked quote cards */}
                <div className="md:hidden space-y-4">
                  {filteredQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {quote.supplier_name || "Unknown Supplier"}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {inputMethodLabels[quote.input_method] || "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {quote.total_price
                              ? `${quote.currency || "USD"} ${
                                  quote.total_price
                                }`
                              : "—"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {quote.lead_time_days
                              ? `${quote.lead_time_days}d`
                              : "—"}
                          </p>
                        </div>
                      </div>
                      {/* Details collapsed by default on mobile; toggle to view */}
                      {detailsOpen[quote.id] && (
                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                          {formatBusinessRating(quote) && (
                            <p className="mb-1">
                              <strong>Business Rating:</strong>{" "}
                              {(() => {
                                const r = formatBusinessRating(quote);
                                if (!r) return "—";
                                return r.url ? (
                                  <a
                                    href={r.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {r.text}
                                  </a>
                                ) : (
                                  r.text
                                );
                              })()}
                            </p>
                          )}
                          <p>
                            <strong>Warranty:</strong>{" "}
                            {quote.warranty_months != null
                              ? `${quote.warranty_months}m`
                              : "—"}
                          </p>
                          <p className="mt-1">
                            <strong>Shipping:</strong>{" "}
                            {quote.shipping_cost != null
                              ? `${quote.currency || "USD"} ${
                                  quote.shipping_cost
                                }`
                              : "—"}
                          </p>
                          <p className="mt-1">
                            <strong>Payment:</strong>{" "}
                            {quote.payment_terms || "—"}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() =>
                            copyToClipboard(
                              JSON.stringify(quote.analysis_json, null, 2),
                            )
                          }
                          className="flex-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                        >
                          Copy JSON
                        </button>
                        <button
                          onClick={() => toggleDetails(quote.id)}
                          className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800/20 text-gray-800 dark:text-gray-200 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-700/50 transition"
                        >
                          {detailsOpen[quote.id] ? "Hide Details" : "Details"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Weight Configuration */}
        <div className="lg:col-span-7">
          {showWeightConfig && availableParams.length > 0 ? (
            <WeightConfiguration
              availableParams={availableParams}
              onWeightsApplied={handleWeightsApplied}
              initialWeights={userWeights}
            />
          ) : (
            <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
                    <Settings className="text-white" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">
                      Smart Quote Ranking
                    </h3>
                    <p className="text-blue-100">Personalize your comparison</p>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="max-w-lg mx-auto text-center">
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-4">
                      <DollarSign
                        className="text-green-600 dark:text-green-400 mx-auto mb-2"
                        size={24}
                      />
                      <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                        Price Weight
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-100 to-sky-100 dark:from-blue-900/30 dark:to-sky-900/30 rounded-xl p-4">
                      <Clock
                        className="text-blue-600 dark:text-blue-400 mx-auto mb-2"
                        size={24}
                      />
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        Speed Priority
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-4">
                      <Award
                        className="text-purple-600 dark:text-purple-400 mx-auto mb-2"
                        size={24}
                      />
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                        Quality Focus
                      </p>
                    </div>
                  </div>
                  <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                    Set Your Priorities
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                    Configure importance weights for different criteria to get
                    personalized recommendations. Our smart algorithm will rank
                    quotes based on what matters most to you.
                  </p>
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowWeightConfig(true)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-xl hover:from-blue-700 hover:to-purple-700 transition font-semibold text-lg shadow-lg transform hover:scale-105"
                    >
                      Configure Priorities
                    </button>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Takes less than 2 minutes • Improves accuracy by 70%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Personalized Score Explanation */}
      {userWeights && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 p-6">
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-3 flex-shrink-0">
                <Crown className="text-white" size={28} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-purple-800 dark:text-purple-100 text-lg">
                    🎯 Smart Ranking Active
                  </h3>
                  <span className="bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full text-xs font-semibold">
                    Personalized
                  </span>
                </div>
                <p className="text-purple-700 dark:text-purple-200 leading-relaxed">
                  Quotes are intelligently ranked using your custom priority
                  weights. The "Best Match" represents optimal value based on
                  what matters most to you.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(userWeights)
                    .filter(([_, config]) => config.enabled)
                    .map(([key, config]) => (
                      <span
                        key={key}
                        className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-700"
                      >
                        {config.name}: {config.weight}%
                      </span>
                    ))}
                </div>
              </div>
              <button
                onClick={() => setShowWeightConfig(true)}
                className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm text-purple-700 dark:text-purple-300 px-3 py-2 rounded-lg hover:bg-white/30 dark:hover:bg-gray-800/30 transition text-sm font-medium border border-purple-200/50 dark:border-purple-700/50"
              >
                Adjust
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
