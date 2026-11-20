import { Mail, Plus, RefreshCw } from "lucide-react";
import { timeAgo } from "./emailUtils.js";

export const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Needs review" },
  { id: "awaiting", label: "Awaiting reply" },
  { id: "approved", label: "Quotes saved" },
  { id: "rejected", label: "Rejected" },
];

export default function InboxHeader({ total, counts, lastUpdated, refreshing, filter, onFilter, onNew, onRefresh }) {
  return (
    <div className="card p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Mail size={20} /> Supplier conversations
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {total} conversation{total !== 1 ? "s" : ""}
            {counts.pending ? ` · ${counts.pending} need${counts.pending === 1 ? "s" : ""} review` : ""}
            {lastUpdated ? ` · updated ${timeAgo(lastUpdated)}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onNew} className="btn-primary">
            <Plus size={18} /> New request
          </button>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="btn-secondary"
            title="Refresh (also refreshes automatically every minute)"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {FILTERS.filter((f) => f.id === "all" || counts[f.id]).map((f) => (
            <button
              key={f.id}
              onClick={() => onFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filter === f.id
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {f.label} ({counts[f.id] || 0})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
