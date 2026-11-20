import { Trash2, RefreshCw } from "lucide-react";
import { INPUT_METHOD_LABELS, money, formatBusinessRating } from "../compare/scoring.js";

export default function QuoteList({ quotes, loading, onRefresh, onDelete, compareHref }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">📋 Saved quotes ({quotes.length})</h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-4">📭</div>
          <p>No quotes yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {quotes.map((q) => {
            const rating = formatBusinessRating(q);
            return (
              <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">{q.supplier_name || "Unknown supplier"}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(q.created_at).toLocaleDateString()} · {INPUT_METHOD_LABELS[q.input_method] || "—"}
                    </p>
                  </div>
                  <button onClick={() => onDelete(q)} className="text-red-500 hover:text-red-700" aria-label="Delete quote">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300 mt-3">
                  <div>
                    <span className="font-medium">Price:</span> {money(q.total_price, q.currency)}
                  </div>
                  <div>
                    <span className="font-medium">Lead time:</span> {q.lead_time_days ? `${q.lead_time_days} days` : "—"}
                  </div>
                  {rating && (
                    <div className="col-span-2">
                      <span className="font-medium">Rating:</span> {rating.text}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {quotes.length > 0 && (
        <a href={compareHref} className="block text-center w-full mt-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
          📊 Compare all quotes
        </a>
      )}
    </div>
  );
}
