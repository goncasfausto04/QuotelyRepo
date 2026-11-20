// Side-by-side table: one column per supplier (in ranking order), the best
// value of each row marked, the others showing how far they are from it.

import { visibleRows } from "./rows.js";
import { bestOf } from "./scoring.js";

function Cell({ row, quote, best, currency }) {
  const v = row.get(quote);
  const isBest = best != null && v != null && v === best;
  const showDelta = best != null && v != null && !isBest && row.delta;
  return (
    <td
      className={`px-4 py-3 align-top ${row.text ? "text-sm text-gray-700 dark:text-gray-300" : "num"} ${
        isBest ? "bg-green-50 dark:bg-green-950/40" : ""
      }`}
    >
      <div className={`${row.primary ? "text-base font-semibold" : "text-sm"} ${v == null ? "text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>
        {row.format(v, currency, quote)}
      </div>
      {row.key === "total" && v != null && quote.std.shipping == null && (
        <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">shipping not stated</div>
      )}
      {isBest && <div className="text-xs font-medium text-green-700 dark:text-green-400 mt-0.5">Best</div>}
      {showDelta && <div className="text-xs text-gray-500 mt-0.5">{row.delta(v, best, currency)}</div>}
    </td>
  );
}

export default function ComparisonTable({ quotes, currency, ranked }) {
  const rows = visibleRows(quotes);
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-3 w-44 min-w-[11rem]" />
            {quotes.map((q, i) => (
              <th key={q.id} className="px-4 py-3 align-bottom min-w-[10rem]">
                {ranked && q.score != null && <div className="text-xs font-medium text-gray-500 num">#{i + 1} · {Math.round(q.score)} pts</div>}
                <div className="font-semibold text-gray-900 dark:text-white leading-snug">{q.supplier_name || `Supplier ${i + 1}`}</div>
                {ranked && q.score != null && (
                  <div className="mt-2 h-1 rounded bg-gray-200 dark:bg-gray-800">
                    <div className="h-1 rounded bg-blue-600" style={{ width: `${Math.max(4, q.score)}%` }} />
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => {
            const best = row.better ? bestOf(quotes.map(row.get), row.better) : null;
            return (
              <tr key={row.key}>
                <th scope="row" className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-3 align-top text-sm font-medium text-gray-600 dark:text-gray-400" title={row.hint}>
                  {row.label}
                </th>
                {quotes.map((q) => (
                  <Cell key={q.id} row={row} quote={q} best={best} currency={currency} />
                ))}
              </tr>
            );
          })}
          <tr>
            <th scope="row" className="sticky left-0 bg-white dark:bg-gray-900 px-4 py-3 align-top text-sm font-medium text-gray-600 dark:text-gray-400">
              Notes
            </th>
            {quotes.map((q) => (
              <td key={q.id} className="px-4 py-3 align-top text-xs text-gray-500">
                {q.std.flags.length ? q.std.flags.join("; ") : "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
