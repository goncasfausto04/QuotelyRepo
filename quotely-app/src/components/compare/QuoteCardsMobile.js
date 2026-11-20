import { useState } from "react";
import { formatBusinessRating, money, INPUT_METHOD_LABELS } from "./scoring.js";

export default function QuoteCardsMobile({ quotes }) {
  const [open, setOpen] = useState({});

  return (
    <div className="md:hidden space-y-4">
      {quotes.map((q) => {
        const rating = formatBusinessRating(q);
        return (
          <div key={q.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{q.supplier_name || "Unknown supplier"}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{INPUT_METHOD_LABELS[q.input_method] || "—"}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{money(q.total_price, q.currency)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{q.lead_time_days ? `${q.lead_time_days}d` : "—"}</p>
              </div>
            </div>
            {open[q.id] && (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                {rating && (
                  <p>
                    <strong>Rating:</strong> {rating.text}
                  </p>
                )}
                <p>
                  <strong>Warranty:</strong> {q.warranty_months != null ? `${q.warranty_months}m` : "—"}
                </p>
                <p>
                  <strong>Shipping:</strong> {q.shipping_cost != null ? money(q.shipping_cost, q.currency) : "—"}
                </p>
                <p>
                  <strong>Payment:</strong> {q.payment_terms || "—"}
                </p>
              </div>
            )}
            <button
              onClick={() => setOpen((o) => ({ ...o, [q.id]: !o[q.id] }))}
              className="mt-3 w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {open[q.id] ? "Hide details" : "Details"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
