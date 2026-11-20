// Phone layout: one card per supplier with the same rows as the table.

import { visibleRows } from "./rows.js";
import { bestOf } from "./scoring.js";

export default function QuoteCardsMobile({ quotes, currency, ranked }) {
  const rows = visibleRows(quotes);
  const bests = Object.fromEntries(rows.map((r) => [r.key, r.better ? bestOf(quotes.map(r.get), r.better) : null]));

  return (
    <div className="space-y-3">
      {quotes.map((q, i) => (
        <div key={q.id} className="card p-4">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">{q.supplier_name || `Supplier ${i + 1}`}</h3>
            {ranked && q.score != null && <span className="text-xs text-gray-500 num">#{i + 1} · {Math.round(q.score)} pts</span>}
          </div>
          <dl className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => {
              const v = r.get(q);
              const isBest = bests[r.key] != null && v === bests[r.key];
              return (
                <div key={r.key} className="flex justify-between gap-3 py-1.5 text-sm">
                  <dt className="text-gray-500">{r.label}</dt>
                  <dd className={`text-right num ${r.primary ? "font-semibold" : ""} ${isBest ? "text-green-700 dark:text-green-400" : "text-gray-900 dark:text-gray-100"}`}>
                    {r.format(v, currency, q)}
                    {isBest && " ✓"}
                  </dd>
                </div>
              );
            })}
          </dl>
          {q.std.flags.length > 0 && <p className="text-xs text-gray-500 mt-2">{q.std.flags.join("; ")}</p>}
        </div>
      ))}
    </div>
  );
}
