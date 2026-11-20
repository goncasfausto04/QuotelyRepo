// Inbox > Find suppliers: search near a location, see them on a map, pick
// the ones to email, then "Send request" opens the composer with them.

import { useMemo, useState } from "react";
import { Search, Send } from "lucide-react";
import Notice from "../ui/Notice.js";
import useSupplierSearch from "./useSupplierSearch.js";
import SupplierMap from "./SupplierMap.js";
import SupplierItem from "./SupplierItem.js";
import { supplierKey } from "./suppliersApi.js";

export default function SupplierFinder({ briefingId, defaultLocation, contacted = [], onSend }) {
  const s = useSupplierSearch(briefingId);
  const [location, setLocation] = useState(null); // null = use saved/default
  const [selected, setSelected] = useState(() => new Map()); // key -> supplier
  const [focused, setFocused] = useState(null);
  const contactedSet = useMemo(() => new Set(contacted.map((c) => c.toLowerCase())), [contacted]);
  const where = location ?? (s.location || defaultLocation || "");

  const toggle = (sup) =>
    setSelected((prev) => {
      const next = new Map(prev);
      const key = supplierKey(sup);
      next.has(key) ? next.delete(key) : next.set(key, sup);
      return next;
    });

  const selectAllNew = () =>
    setSelected(new Map(s.suppliers.filter((x) => x.contact_email && !contactedSet.has(x.contact_email)).map((x) => [supplierKey(x), x])));

  const withEmail = s.suppliers.filter((x) => x.contact_email).length;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!s.searching) s.search(where.trim());
          }}
        >
          <input
            value={where}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, region or country (empty = anywhere)"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={s.searching} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
            <Search size={16} /> {s.searching ? "Searching the web… (up to a minute)" : s.suppliers.length ? "Search again" : "Find suppliers"}
          </button>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Searches the web for companies that match this briefing's requirements. Blue = has an email, grey = no email found, green = selected.
        </p>
      </div>

      {s.error && <Notice type="error">{s.error}</Notice>}

      <SupplierMap suppliers={s.suppliers} center={s.center} selected={selected} focused={focused} onToggle={toggle} onFocus={setFocused} />

      {s.suppliers.length > 0 ? (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {s.suppliers.length} found · {withEmail} with email
            </span>
            {withEmail > 1 && (
              <button onClick={selectAllNew} className="text-blue-600 dark:text-blue-400 hover:underline">
                Select all with email
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            {s.suppliers.map((sup) => {
              const key = supplierKey(sup);
              return (
                <SupplierItem
                  key={key}
                  supplier={sup}
                  selected={selected.has(key)}
                  focused={focused === key}
                  contacted={sup.contact_email && contactedSet.has(sup.contact_email)}
                  onToggle={() => toggle(sup)}
                  onFocus={() => setFocused(key)}
                />
              );
            })}
          </div>
        </>
      ) : (
        !s.loading && !s.searching && <p className="text-sm text-center text-gray-500 py-4">No suppliers yet. Search to see them on the map.</p>
      )}

      {selected.size > 0 && (
        <div className="sticky bottom-4 z-10">
          <button
            onClick={() => onSend([...selected.values()].map((x) => ({ name: x.name, email: x.contact_email })))}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-green-600 text-white shadow-lg hover:bg-green-700"
          >
            <Send size={18} /> Send request to {selected.size} supplier{selected.size === 1 ? "" : "s"}
          </button>
        </div>
      )}
    </div>
  );
}
