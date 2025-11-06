// src/components/ComparisonDashboard.js
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Award,
  AlertCircle,
} from "lucide-react";

export default function ComparisonDashboard({ briefingId }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("quotes")
          .select("*, briefings(title)")
          .order("created_at", { ascending: false });

        // Filter by briefing if provided
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

  // Calculate best values
  const getBestPrice = () => {
    const prices = quotes
      .filter((q) => q.total_price)
      .map((q) => q.total_price);
    return prices.length ? Math.min(...prices) : null;
  };

  const getBestLeadTime = () => {
    const times = quotes
      .filter((q) => q.lead_time_days)
      .map((q) => q.lead_time_days);
    return times.length ? Math.min(...times) : null;
  };

  const bestPrice = getBestPrice();
  const bestLeadTime = getBestLeadTime();

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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          📊 Quote Comparison Dashboard
        </h2>
        <p className="text-gray-600">
          Comparing {quotes.length} supplier{" "}
          {quotes.length === 1 ? "quote" : "quotes"}
          {briefingId &&
            quotes[0]?.briefings?.title &&
            ` for "${quotes[0].briefings.title}"`}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Best Price</p>
              <p className="text-2xl font-bold text-green-600">
                {bestPrice ? `$${bestPrice}` : "—"}
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Fastest Delivery</p>
              <p className="text-2xl font-bold text-blue-600">
                {bestLeadTime ? `${bestLeadTime} days` : "—"}
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Clock className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Quotes</p>
              <p className="text-2xl font-bold text-purple-600">
                {quotes.length}
              </p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Award className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Terms
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warranty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotes.map((quote) => {
                const isBestPrice = quote.total_price === bestPrice;
                const isBestTime = quote.lead_time_days === bestLeadTime;

                return (
                  <tr
                    key={quote.id}
                    className={`hover:bg-blue-50 transition ${
                      isBestPrice || isBestTime ? "bg-green-50" : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {quote.supplier_name || "Unknown Supplier"}
                          </div>
                          {quote.created_at && (
                            <div className="text-xs text-gray-500">
                              {new Date(quote.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            isBestPrice ? "text-green-600" : "text-gray-900"
                          }`}
                        >
                          {quote.total_price
                            ? `${quote.currency || "USD"} ${quote.total_price}`
                            : "—"}
                        </span>
                        {isBestPrice && (
                          <TrendingDown size={16} className="text-green-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${
                            isBestTime
                              ? "text-blue-600 font-semibold"
                              : "text-gray-900"
                          }`}
                        >
                          {quote.lead_time_days
                            ? `${quote.lead_time_days} days`
                            : "—"}
                        </span>
                        {isBestTime && (
                          <TrendingUp size={16} className="text-blue-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {quote.payment_terms || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {quote.warranty_period || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {quote.contact_email ? (
                          <a
                            href={`mailto:${quote.contact_email}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {quote.contact_email}
                          </a>
                        ) : quote.contact_phone ? (
                          <a
                            href={`tel:${quote.contact_phone}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {quote.contact_phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
