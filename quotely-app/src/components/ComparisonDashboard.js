// src/components/ComparisonDashboard.js
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
  Zap,
  Settings,
} from "lucide-react";
import WeightConfiguration from "./WeightConfiguration.js";

export default function ComparisonDashboard({ briefingId }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userWeights, setUserWeights] = useState(null);
  const [showWeightConfig, setShowWeightConfig] = useState(false);
  const [scoredQuotes, setScoredQuotes] = useState([]);

  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("quotes")
          .select("*, briefings(title)")
          .order("created_at", { ascending: false });

        if (briefingId) {
          query = query.eq("briefing_id", briefingId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setQuotes(data || []);
      } catch (err) {
        console.error("Error fetching quotes:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [briefingId]);

  // ENHANCED PARAMETER DETECTION - FIXED VERSION
  const getAvailableParameters = () => {
    if (!quotes.length) return [];

    const params = [];

    // Define which parameters we actually want to compare
    const allowedParameters = {
      total_price: {
        name: "Total Price",
        direction: "lower",
        description: "Total cost including all charges",
      },
      lead_time_days: {
        name: "Lead Time",
        direction: "lower",
        description: "Days until completion",
      },
      warranty_months: {
        name: "Warranty",
        direction: "higher",
        description: "Warranty duration in months",
      },
      shipping_cost: {
        name: "Shipping Cost",
        direction: "lower",
        description: "Additional shipping charges",
      },
      payment_terms: {
        name: "Payment Flexibility",
        direction: "higher",
        description: "Favorable payment terms",
      },
    };

    // Count occurrences of each allowed parameter
    const paramCounts = {};

    quotes.forEach((quote) => {
      Object.keys(allowedParameters).forEach((paramKey) => {
        const value = quote[paramKey];

        // Check if parameter exists and has a meaningful value
        if (value != null && value !== "" && !isNaN(value)) {
          paramCounts[paramKey] = (paramCounts[paramKey] || 0) + 1;
        } else if (paramKey === "payment_terms" && value) {
          // Special handling for payment_terms (text field)
          paramCounts[paramKey] = (paramCounts[paramKey] || 0) + 1;
        }
      });
    });

    // Create parameter objects only for parameters that appear in multiple quotes
    Object.keys(allowedParameters).forEach((paramKey) => {
      const count = paramCounts[paramKey] || 0;

      // Only include parameters that appear in at least 2 quotes
      if (count >= 2) {
        params.push({
          key: paramKey,
          name: allowedParameters[paramKey].name,
          direction: allowedParameters[paramKey].direction,
          description: allowedParameters[paramKey].description,
          count: count,
        });
      }
    });

    return params.sort((a, b) => b.count - a.count);
  };

  // Calculate scores based on user weights (0-5 multiplicative scale)
  const calculateScores = (weights) => {
    if (!weights || Object.keys(weights).length === 0) return quotes;

    const availableParams = getAvailableParameters();

    return quotes
      .map((quote) => {
        let totalScore = 0;
        const parameterScores = {};

        // Get enabled parameters with their weights
        const enabledParams = availableParams.filter((param) => {
          const weightConfig = weights[param.key];
          return (
            weightConfig && weightConfig.enabled && weightConfig.weight > 0
          );
        });

        if (enabledParams.length === 0)
          return { ...quote, score: 0, parameterScores: {} };

        // Calculate raw scores for each parameter
        enabledParams.forEach((param) => {
          const weightConfig = weights[param.key];
          const value = quote[param.key];

          if (value == null) return;

          const allValues = quotes
            .map((q) => q[param.key])
            .filter((v) => v != null)
            .sort((a, b) => a - b);

          if (allValues.length === 0) return;

          const min = allValues[0];
          const max = allValues[allValues.length - 1];

          let normalizedScore = 0;

          if (min === max) {
            normalizedScore = 1; // All values are equal, give full score
          } else if (weightConfig.direction === "higher") {
            normalizedScore = (value - min) / (max - min);
          } else {
            normalizedScore = (max - value) / (max - min);
          }

          // Store individual parameter score (0-1 scale)
          parameterScores[param.key] = {
            originalValue: value,
            normalizedScore: normalizedScore,
            weight: weightConfig.weight,
            rawContribution: normalizedScore * weightConfig.weight,
          };
        });

        // Calculate total raw score
        const totalRawScore = Object.values(parameterScores).reduce(
          (sum, score) => sum + score.rawContribution,
          0
        );

        // Calculate total possible score (if all parameters were perfect)
        const totalPossibleScore = Object.values(parameterScores).reduce(
          (sum, score) => sum + score.weight,
          0
        );

        // Convert to percentage (0-100%)
        const finalScore =
          totalPossibleScore > 0
            ? (totalRawScore / totalPossibleScore) * 100
            : 0;

        // Calculate percentage contributions for display
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
          parameterScores: parameterScores,
          enabledParamCount: enabledParams.length,
        };
      })
      .sort((a, b) => b.score - a.score);
  };

  // Apply weights and calculate scores
  const handleWeightsApplied = (weights) => {
    setUserWeights(weights);
    const scored = calculateScores(weights);
    setScoredQuotes(scored);
    setShowWeightConfig(false);

    // Save to localStorage for persistence
    localStorage.setItem(
      `quotely_weights_${briefingId}`,
      JSON.stringify(weights)
    );
  };

  // Load saved weights on component mount
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
  }, [briefingId]);

  // Reset to default view
  const resetWeights = () => {
    setUserWeights(null);
    setScoredQuotes([]);
    if (briefingId) {
      localStorage.removeItem(`quotely_weights_${briefingId}`);
    }
  };

  // Calculate best values for summary cards
  const getBestPrice = () => {
    const validQuotes = quotes.filter(
      (q) => q.total_price && !isNaN(q.total_price)
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
      (q) => q.lead_time_days && !isNaN(q.lead_time_days)
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

  // Calculate average price for percentage comparisons
  const getAveragePrice = () => {
    const validQuotes = quotes.filter(
      (q) => q.total_price && !isNaN(q.total_price)
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

  // Use scored quotes if available, otherwise use original quotes
  const displayQuotes = scoredQuotes.length > 0 ? scoredQuotes : quotes;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Quotes</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!quotes.length) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
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
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Quotes Yet
          </h3>
          <p className="text-gray-600 mb-6">
            {briefingId
              ? "No quotes have been analyzed for this briefing yet."
              : "Start analyzing supplier quotes to see comparisons here."}
          </p>
          <button
            onClick={() => (window.location.href = "/analyze")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
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
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Quotes ({quotes.length}) Comparison
            </h1>
            <p className="text-xl text-gray-600">
              {briefingId && quotes[0]?.briefings?.title
                ? `Comparing quotes for "${quotes[0].briefings.title}"`
                : "Compare all your supplier quotes"}
            </p>
          </div>
          <div className="flex gap-3">
            {userWeights && (
              <button
                onClick={resetWeights}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Reset to Default
              </button>
            )}
            <button
              onClick={() => setShowWeightConfig(!showWeightConfig)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition font-semibold shadow-lg"
            >
              <Settings size={20} />
              {userWeights ? "Adjust Priorities" : "Configure Priorities"}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Best Price Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-semibold mb-2">
                  Best Price
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {bestPrice ? `${bestPrice.currency} ${bestPrice.value}` : "—"}
                </p>
                <p className="text-green-700 font-medium">
                  {bestPrice?.supplier || "No supplier"}
                </p>
              </div>
              <div className="bg-green-500 rounded-2xl p-4">
                <DollarSign className="text-white" size={32} />
              </div>
            </div>
          </div>

          {/* Best Overall Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-semibold mb-2">
                  {userWeights ? "🎯 Best Overall" : "Best Value"}
                </p>
                {userWeights && bestOverall ? (
                  <>
                    <p className="text-3xl font-bold text-gray-900 mb-1">
                      {bestOverall.score}%
                    </p>
                    <p className="text-purple-700 font-medium">
                      {bestOverall.supplier}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Based on your priorities
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-gray-900 mb-1">—</p>
                    <p className="text-purple-600 text-sm">
                      Configure priorities to find best match
                    </p>
                  </>
                )}
              </div>
              <div className="bg-purple-500 rounded-2xl p-4">
                <Crown className="text-white" size={32} />
              </div>
            </div>
          </div>

          {/* Fastest Delivery Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-semibold mb-2">
                  Fastest Delivery
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {bestLeadTime ? `${bestLeadTime.value} days` : "—"}
                </p>
                <p className="text-blue-700 font-medium">
                  {bestLeadTime?.supplier || "No supplier"}
                </p>
              </div>
              <div className="bg-blue-500 rounded-2xl p-4">
                <Zap className="text-white" size={32} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Adjusted Layout (40% table, 60% weights) */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Left Column - Price Comparison and Table (40%) */}
        <div className="xl:col-span-2 space-y-8">
          {/* Price Comparison Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Price Comparison
            </h2>
            <div className="space-y-3">
              {displayQuotes.map((quote, index) => {
                if (!quote.total_price) return null;

                const priceDiff = averagePrice
                  ? ((quote.total_price - averagePrice) / averagePrice) * 100
                  : 0;
                const isBestPrice =
                  bestPrice && quote.total_price === bestPrice.value;
                const isBestOverall = userWeights && index === 0;

                return (
                  <div
                    key={quote.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="w-32">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isBestOverall
                              ? "bg-purple-500"
                              : isBestPrice
                              ? "bg-green-500"
                              : "bg-blue-500"
                          }`}
                        ></div>
                        <span className="font-semibold text-gray-900 text-sm">
                          {quote.supplier_name || "Unknown Supplier"}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>
                          {quote.currency || "USD"} {quote.total_price}
                        </span>
                        <span
                          className={
                            priceDiff <= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          {priceDiff <= 0 ? "" : "+"}
                          {priceDiff.toFixed(1)}% vs avg
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isBestOverall
                              ? "bg-purple-500"
                              : isBestPrice
                              ? "bg-green-500"
                              : "bg-blue-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (quote.total_price / (averagePrice * 1.5)) * 100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compact Comparison Table */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Quick Comparison
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase">
                      Metric
                    </th>
                    {displayQuotes.slice(0, 3).map((quote, index) => (
                      <th key={quote.id} className="text-center py-3 px-2">
                        <div className="flex flex-col items-center">
                          <span className="font-semibold text-gray-900 text-xs">
                            {quote.supplier_name?.split(" ")[0] ||
                              `S${index + 1}`}
                          </span>
                          {userWeights && quote.score && (
                            <span className="text-xs text-purple-600 font-medium mt-1">
                              {Math.round(quote.score)}%
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Price Row */}
                  <tr className="hover:bg-gray-50 transition">
                    <td className="py-3 font-medium text-gray-700 text-xs">
                      Price
                    </td>
                    {displayQuotes.slice(0, 3).map((quote) => (
                      <td key={quote.id} className="py-3 px-2 text-center">
                        <div
                          className={`font-semibold text-xs ${
                            bestPrice && quote.total_price === bestPrice.value
                              ? "text-green-600"
                              : "text-gray-900"
                          }`}
                        >
                          {quote.total_price
                            ? `${quote.currency || "USD"} ${quote.total_price}`
                            : "—"}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Lead Time Row */}
                  <tr className="hover:bg-gray-50 transition">
                    <td className="py-3 font-medium text-gray-700 text-xs">
                      Lead Time
                    </td>
                    {displayQuotes.slice(0, 3).map((quote) => (
                      <td key={quote.id} className="py-3 px-2 text-center">
                        <div
                          className={`text-xs ${
                            bestLeadTime &&
                            quote.lead_time_days === bestLeadTime.value
                              ? "text-blue-600 font-semibold"
                              : "text-gray-700"
                          }`}
                        >
                          {quote.lead_time_days
                            ? `${quote.lead_time_days}d`
                            : "—"}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Warranty Row */}
                  <tr className="hover:bg-gray-50 transition">
                    <td className="py-3 font-medium text-gray-700 text-xs">
                      Warranty
                    </td>
                    {displayQuotes.slice(0, 3).map((quote) => (
                      <td
                        key={quote.id}
                        className="py-3 px-2 text-center text-gray-700 text-xs"
                      >
                        {quote.warranty_months
                          ? `${quote.warranty_months}m`
                          : "—"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Weight Configuration (60%) */}
        <div className="xl:col-span-3">
          {showWeightConfig && availableParams.length > 0 ? (
            <WeightConfiguration
              availableParams={availableParams}
              onWeightsApplied={handleWeightsApplied}
              initialWeights={userWeights}
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <Settings className="text-blue-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  Configure Your Priorities
                </h3>
                <p className="text-gray-600 mb-6 text-lg">
                  Adjust importance weights to personalize your quote comparison
                  and find the best overall value for your needs.
                </p>
                <button
                  onClick={() => setShowWeightConfig(true)}
                  className="bg-blue-600 text-white py-3 px-8 rounded-xl hover:bg-blue-700 transition font-semibold text-lg shadow-lg"
                >
                  Open Priority Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Personalized Score Explanation */}
      {userWeights && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center gap-4">
            <Crown className="text-purple-600 flex-shrink-0" size={28} />
            <div>
              <h3 className="font-semibold text-purple-800 text-lg mb-2">
                Personalized Ranking Active
              </h3>
              <p className="text-purple-700">
                Quotes are ranked based on your priority settings. The "Best
                Overall" quote represents the best overall value according to
                your configured weights.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
