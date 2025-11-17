// src/components/QuoteAnalysis.js
import { useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function QuoteAnalysis({ briefingId }) {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

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

    try {
      // 🔹 1. Send email text to your AI backend for analysis
      const res = await fetch("http://localhost:3001/api/analyze-email", {
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

      // 🔹 2. INSERT (not update!) the quote into the quotes table
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
      alert(
        "Quote analyzed and saved successfully! Check the comparison dashboard."
      );

      // Clear the form
      setText("");
    } catch (err) {
      console.error("Analysis error:", err);
      setFeedback({ error: err.message });
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">📧 Quote Analysis</h2>
        <p className="text-sm text-gray-600 mt-1">
          Paste a supplier quote email to extract and compare key information
        </p>
        {briefingId && (
          <p className="text-xs text-blue-600 mt-2">
            📎 Linked to Briefing ID: {briefingId}
          </p>
        )}
      </div>

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
        <p className="text-xs text-gray-500 mt-1">{text.length} characters</p>
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

      {feedback && (
        <div
          className={`rounded-lg p-4 ${
            feedback.error
              ? "bg-red-50 border border-red-200"
              : "bg-green-50 border border-green-200"
          }`}
        >
          <h3 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
            {feedback.error ? "❌ Error" : "✅ Analysis Complete"}
          </h3>

          {feedback.error ? (
            <p className="text-red-700">{feedback.error}</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">Supplier:</span>
                  <span className="ml-2 text-gray-900">
                    {feedback.supplier_name || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Total Price:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {feedback.total_price
                      ? `${feedback.currency || "USD"} ${feedback.total_price}`
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Lead Time:</span>
                  <span className="ml-2 text-gray-900">
                    {feedback.lead_time_days
                      ? `${feedback.lead_time_days} days`
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Warranty:</span>
                  <span className="ml-2 text-gray-900">
                    {feedback.warranty_period || "—"}
                  </span>
                </div>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                  View Full Analysis JSON
                </summary>
                <pre className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(feedback, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
