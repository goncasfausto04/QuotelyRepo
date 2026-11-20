// Find suppliers for the finished briefing (Google search + AI).

import { useState } from "react";
import { Search } from "lucide-react";
import SupplierCard from "./SupplierCard.js";

export default function SupplierSearchPanel({ suppliers, defaultLocation, busy, onSearch, onGoToInbox }) {
  const [location, setLocation] = useState(defaultLocation || "");
  const searching = busy === "searching";

  return (
    <div className="mt-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Search size={16} /> Find suppliers
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
        I'll search the web for companies that can supply this. Leave the location empty to search anywhere.
      </p>
      <div className="flex gap-2">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && onSearch(location.trim())}
          placeholder="City, region or country (optional)"
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => onSearch(location.trim())}
          disabled={!!busy}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? "Searching…" : suppliers.length ? "Search again" : "Search"}
        </button>
      </div>

      {suppliers.length > 0 && (
        <div className="mt-4 space-y-2">
          {suppliers.map((s, i) => (
            <SupplierCard key={`${s.name}-${i}`} supplier={s} />
          ))}
          <button onClick={onGoToInbox} className="w-full mt-2 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700">
            Send the request to these suppliers →
          </button>
        </div>
      )}
    </div>
  );
}
