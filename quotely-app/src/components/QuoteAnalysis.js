// src/components/QuoteAnalysis.js
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import {
  CheckCircle,
  AlertCircle,
  Eye,
  Copy,
  Trash2,
  RefreshCw,
} from "lucide-react";

export default function QuoteAnalysis({ briefingId, onQuoteAdded }) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL;
  const [savedQuote, setSavedQuote] = useState(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [existingQuotes, setExistingQuotes] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // [quoteId, quoteSupplier]

  // Fetch existing quotes for this briefing
  useEffect(() => {
    const fetchExistingQuotes = async () => {
      if (!briefingId) return;

      setLoadingQuotes(true);
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("*")
          .eq("briefing_id", briefingId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setExistingQuotes(data || []);
      } catch (error) {
        console.error("Error fetching quotes:", error);
      } finally {
        setLoadingQuotes(false);
      }
    };

    fetchExistingQuotes();
  }, [briefingId, savedQuote]); // Refetch when briefingId changes or new quote is added

  const handleAnalyze = async () => {
    if (!text.trim()) {
      alert("Please paste an email to analyze");
      return;
    }

    if (!briefingId) {
      alert("No briefing selected. Please create or select a briefing first.");
      return;
    }

    setLoading(true);
    setFeedback(null);
    setSavedQuote(null);

    try {
      // 🔹 1. Send email text to your AI backend for analysis
      const res = await fetch(`${API_URL}/api/analyze-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText: text }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Parse the analysis result
      let analysisResult;
      try {
        analysisResult =
          typeof data.analysis === "string"
            ? JSON.parse(data.analysis)
            : data.analysis;
      } catch (parseError) {
        console.error("Failed to parse analysis:", parseError);
        throw new Error("Invalid analysis format from server");
      }

      setFeedback(analysisResult);

      // 2. Save the quote to Supabase
      const { data: insertedQuote, error: insertError } = await supabase
        .from("quotes")
        .insert({
          briefing_id: briefingId,
          supplier_name: analysisResult.supplier_name,
          contact_email: analysisResult.contact_email,
          contact_phone: analysisResult.contact_phone,
          total_price: analysisResult.total_price,
          currency: analysisResult.currency || "USD",
          unit_price: analysisResult.unit_price,
          quantity: analysisResult.quantity,
          lead_time_days: analysisResult.lead_time_days,
          delivery_date: analysisResult.delivery_date,
          payment_terms: analysisResult.payment_terms,
          warranty_period: analysisResult.warranty_period,
          warranty_months: analysisResult.warranty_months,
          shipping_cost: analysisResult.shipping_cost,
          raw_email_text: text,
          analysis_json: analysisResult,
          notes: analysisResult.notes,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        throw new Error("Failed to save quote to database");
      }

      console.log("✅ Quote saved successfully:", insertedQuote);
      setSavedQuote(insertedQuote);

      // Notify parent component that a new quote was added
      if (onQuoteAdded) {
        onQuoteAdded(insertedQuote);
      }

      // Clear the form
      setText("");
    } catch (err) {
      console.error("Analysis error:", err);
      setFeedback({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setText("");
    setFeedback(null);
    setSavedQuote(null);
    setShowFullAnalysis(false);
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    alert("Copied to clipboard!");
  };

  const confirmDelete = (quoteId, supplierName) => {
    setShowDeleteConfirm({ quoteId, supplierName });
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  const deleteQuote = async () => {
    if (!showDeleteConfirm) return;

    const { quoteId } = showDeleteConfirm;

    try {
      const { error } = await supabase
        .from("quotes")
        .delete()
        .eq("id", quoteId);

      if (error) throw error;

      // Remove from local state
      setExistingQuotes((prev) => prev.filter((quote) => quote.id !== quoteId));
      setShowDeleteConfirm(null);
      alert("Quote deleted successfully!");
    } catch (error) {
      console.error("Error deleting quote:", error);
      alert("Failed to delete quote");
      setShowDeleteConfirm(null);
    }
  };

  const refreshQuotes = async () => {
    if (!briefingId) return;

    setLoadingQuotes(true);
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("briefing_id", briefingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExistingQuotes(data || []);
    } catch (error) {
      console.error("Error refreshing quotes:", error);
    } finally {
      setLoadingQuotes(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Delete Quote?
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the quote from{" "}
              <strong>
                {showDeleteConfirm.supplierName || "Unknown Supplier"}
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteQuote}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete Quote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              📧 Quote Analysis
            </h2>
            <p className="text-gray-600 mt-2">
              Analyze supplier quotes and manage all your analyzed quotes in one
              place
            </p>
          </div>
          {briefingId && (
            <div className="text-right">
              <p className="text-sm text-blue-600">📎 Briefing: {briefingId}</p>
              <p className="text-xs text-gray-500 mt-1">
                {existingQuotes.length} quote
                {existingQuotes.length !== 1 ? "s" : ""} analyzed
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Analyze New Quote */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              🔍 Analyze New Quote
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Quote Email
                </label>
                <textarea
                  rows={8}
                  placeholder="Paste the complete email from the supplier here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {text.length} characters
                </p>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading || !text.trim()}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                  loading || !text.trim()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  "🔍 Analyze Quote"
                )}
              </button>
            </div>

            {/* Analysis Preview */}
            {feedback && !feedback.error && !savedQuote && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">
                  👀 Analysis Preview
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium">Supplier:</span>{" "}
                    {feedback.supplier_name || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Price:</span>{" "}
                    {feedback.total_price
                      ? `${feedback.currency || "USD"} ${feedback.total_price}`
                      : "—"}
                  </div>
                  <div>
                    <span className="font-medium">Lead Time:</span>{" "}
                    {feedback.lead_time_days
                      ? `${feedback.lead_time_days} days`
                      : "—"}
                  </div>
                  <div>
                    <span className="font-medium">Warranty:</span>{" "}
                    {feedback.warranty_period || "—"}
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {savedQuote && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle
                    className="text-green-600 flex-shrink-0"
                    size={20}
                  />
                  <div>
                    <h4 className="font-semibold text-green-800">
                      Quote Saved Successfully!
                    </h4>
                    <p className="text-green-700 text-sm">
                      The quote has been added to your analysis.
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="mt-3 w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  Analyze Another Quote
                </button>
              </div>
            )}

            {/* Error Message */}
            {feedback?.error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle
                    className="text-red-600 flex-shrink-0"
                    size={20}
                  />
                  <div>
                    <h4 className="font-semibold text-red-900">
                      Analysis Error
                    </h4>
                    <p className="text-red-700 text-sm">{feedback.error}</p>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Existing Quotes */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              📋 Analyzed Quotes ({existingQuotes.length})
            </h3>
            <button
              onClick={refreshQuotes}
              disabled={loadingQuotes}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              <RefreshCw
                size={16}
                className={loadingQuotes ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {loadingQuotes ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : existingQuotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📭</div>
              <p>No quotes analyzed yet</p>
              <p className="text-sm mt-2">
                Analyze your first quote to see it here
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {existingQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {quote.supplier_name || "Unknown Supplier"}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(quote.created_at).toLocaleDateString()} •
                        {quote.contact_email ? ` ${quote.contact_email}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        confirmDelete(quote.id, quote.supplier_name)
                      }
                      className="text-red-500 hover:text-red-700 transition p-1"
                      title="Delete quote"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Price:</span>
                      <span className="ml-2 text-gray-900">
                        {quote.total_price
                          ? `${quote.currency || "USD"} ${quote.total_price}`
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Lead Time:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {quote.lead_time_days
                          ? `${quote.lead_time_days} days`
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Warranty:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {quote.warranty_period || quote.warranty_months
                          ? `${quote.warranty_months || ""} ${
                              quote.warranty_period || ""
                            }`.trim()
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        Payment:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {quote.payment_terms || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(quote.analysis_json, null, 2)
                        )
                      }
                      className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition"
                    >
                      <Copy size={12} />
                      Copy Data
                    </button>
                    <button
                      onClick={() => (window.location.href = "/briefingpage")}
                      className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition"
                    >
                      <Eye size={12} />
                      Compare
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {existingQuotes.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => (window.location.href = "/briefingpage")}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                📊 Go to Comparison Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
