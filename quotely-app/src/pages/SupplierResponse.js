// Public page where a supplier submits a quote via the briefing's link.

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api.js";
import SupplierQuoteForm from "../components/supplier/SupplierQuoteForm.js";

const Centered = ({ children }) => <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-900">{children}</div>;

export default function SupplierResponse() {
  const { token } = useParams();
  const [briefing, setBriefing] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    apiFetch(`/api/supplier-briefing/${token}`)
      .then(setBriefing)
      .catch((err) => setError(err.message));
  }, [token]);

  const submit = (quoteData) =>
    apiFetch("/api/supplier-submit-quote", { method: "POST", json: { token, quoteData } }).then(() => setSubmitted(true));

  if (error) {
    return (
      <Centered>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Invalid link</h2>
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </Centered>
    );
  }
  if (!briefing) {
    return (
      <Centered>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </Centered>
    );
  }
  if (submitted) {
    return (
      <Centered>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-200 mb-2">Quote submitted</h2>
          <p className="text-green-700 dark:text-green-300">Thank you! The buyer will review your quote.</p>
        </div>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">📋 Submit your quote</h1>
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
          Request: <strong>{briefing.title || "Request for quote"}</strong>
        </p>

        <div className="mb-8 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
          {briefing.requirements?.length ? (
            <dl className="space-y-1.5">
              {briefing.requirements.map((r) => (
                <div key={r.label} className="flex gap-2">
                  <dt className="text-gray-500 dark:text-gray-400 shrink-0 w-36">{r.label}</dt>
                  <dd className="text-gray-900 dark:text-gray-100">{r.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-gray-700 dark:text-gray-200">{briefing.description}</p>
          )}
        </div>

        <SupplierQuoteForm onSubmit={submit} />
      </div>
    </div>
  );
}
