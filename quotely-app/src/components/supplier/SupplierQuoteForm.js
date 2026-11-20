// Public quote form for suppliers (no account needed). Fields are config-driven.

import { useState } from "react";

const input =
  "w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500";

// [key, label, type, options] grouped in rows
const ROWS = [
  [["supplier_name", "Company / supplier name *", "text", { required: true }]],
  [["contact_email", "Contact email", "email"], ["contact_phone", "Phone number", "tel"]],
  [["total_price", "Total price *", "number", { required: true, step: "0.01", min: "0" }], ["currency", "Currency", "currency"]],
  [["shipping_cost", "Shipping cost", "number", { step: "0.01", min: "0" }], ["lead_time_days", "Lead time (days)", "number", { min: "0" }]],
  [["warranty_months", "Warranty (months)", "number", { min: "0" }], ["payment_terms", "Payment terms", "text", { placeholder: "e.g. 30 days net, 50% upfront" }]],
  [["notes", "Additional notes", "textarea", { placeholder: "Specifications, what's included, validity of the offer..." }]],
];

const EMPTY = Object.fromEntries(ROWS.flat().map(([key]) => [key, key === "currency" ? "EUR" : ""]));

function Field({ field: [key, label, type, opts = {}], value, onChange }) {
  const props = { value, onChange: (e) => onChange(key, e.target.value), className: input, ...opts };
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {type === "textarea" ? (
        <textarea rows={4} {...props} />
      ) : type === "currency" ? (
        <select {...props}>
          {["EUR", "USD", "GBP"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      ) : (
        <input type={type} {...props} />
      )}
    </div>
  );
}

export default function SupplierQuoteForm({ onSubmit }) {
  const [data, setData] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const set = (key, value) => setData((d) => ({ ...d, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      setError(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {ROWS.map((row, i) => (
        <div key={i} className="flex flex-col sm:flex-row gap-4">
          {row.map((f) => (
            <Field key={f[0]} field={f} value={data[f[0]]} onChange={set} />
          ))}
        </div>
      ))}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 rounded-lg font-semibold text-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg disabled:bg-gray-300 disabled:text-gray-500"
      >
        {submitting ? "Submitting..." : "📤 Submit quote"}
      </button>
    </form>
  );
}
