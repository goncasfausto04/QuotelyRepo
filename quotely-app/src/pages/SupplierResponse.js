import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

export default function SupplierResponse() {
  const { token } = useParams();
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL;

  const [quoteData, setQuoteData] = useState({
    supplier_name: "",
    contact_email: "",
    contact_phone: "",
    total_price: "",
    currency: "USD",
    lead_time_days: "",
    warranty_months: "",
    payment_terms: "",
    notes: "",
  });

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const res = await fetch(`${API_URL}/api/supplier-briefing/${token}`);

        if (!res.ok) {
          throw new Error("Invalid or expired link");
        }

        const data = await res.json();
        setBriefing(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, [token, API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!quoteData.supplier_name || !quoteData.total_price) {
      alert("Please fill in supplier name and total price");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/supplier-submit-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, quoteData }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit quote");
      }

      setSubmitted(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-900">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">
            Invalid Link
          </h2>
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-900">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-200 mb-2">
            Quote Submitted Successfully!
          </h2>
          <p className="text-green-700 dark:text-green-300">
            Thank you for your response. The buyer will review your quote.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              📋 Submit Your Quote
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Responding to: <strong>{briefing.title || "RFQ"}</strong>
            </p>
            {briefing.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                {briefing.description}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company/Supplier Name *
              </label>
              <input
                type="text"
                required
                value={quoteData.supplier_name}
                onChange={(e) =>
                  setQuoteData({ ...quoteData, supplier_name: e.target.value })
                }
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={quoteData.contact_email}
                  onChange={(e) =>
                    setQuoteData({
                      ...quoteData,
                      contact_email: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={quoteData.contact_phone}
                  onChange={(e) =>
                    setQuoteData({
                      ...quoteData,
                      contact_phone: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={quoteData.total_price}
                  onChange={(e) =>
                    setQuoteData({ ...quoteData, total_price: e.target.value })
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Currency
                </label>
                <select
                  value={quoteData.currency}
                  onChange={(e) =>
                    setQuoteData({ ...quoteData, currency: e.target.value })
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lead Time (days)
                </label>
                <input
                  type="number"
                  value={quoteData.lead_time_days}
                  onChange={(e) =>
                    setQuoteData({
                      ...quoteData,
                      lead_time_days: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Warranty (months)
                </label>
                <input
                  type="number"
                  value={quoteData.warranty_months}
                  onChange={(e) =>
                    setQuoteData({
                      ...quoteData,
                      warranty_months: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                placeholder="e.g., 30 days net, 50% upfront"
                value={quoteData.payment_terms}
                onChange={(e) =>
                  setQuoteData({ ...quoteData, payment_terms: e.target.value })
                }
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Additional Notes
              </label>
              <textarea
                rows={4}
                placeholder="Include any additional details, specifications, or terms..."
                value={quoteData.notes}
                onChange={(e) =>
                  setQuoteData({ ...quoteData, notes: e.target.value })
                }
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition ${
                submitting
                  ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg"
              }`}
            >
              {submitting ? "Submitting..." : "📤 Submit Quote"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
