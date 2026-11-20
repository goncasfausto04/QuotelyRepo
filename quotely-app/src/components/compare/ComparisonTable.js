// Desktop table: one column per quote. "overview" shows values, "calculations"
// shows how each weighted score was computed.

import { formatBusinessRating, money, INPUT_METHOD_LABELS } from "./scoring.js";

const cell = "py-3 px-2 text-center text-xs text-gray-700 dark:text-gray-300";
const labelCell = "py-3 font-medium text-gray-700 dark:text-gray-300 text-xs";

function Rating({ quote }) {
  const r = formatBusinessRating(quote);
  if (!r) return "—";
  return r.url ? (
    <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
      {r.text}
    </a>
  ) : (
    r.text
  );
}

// [label, render(quote)]
const OVERVIEW_ROWS = [
  ["Business rating", (q) => <Rating quote={q} />],
  ["Price", (q) => <span className="font-semibold">{money(q.total_price, q.currency)}</span>],
  ["Lead time", (q) => (q.lead_time_days ? `${q.lead_time_days}d` : "—")],
  ["Warranty (months)", (q) => (q.warranty_months != null ? `${q.warranty_months}m` : "—")],
  ["Warranty details", (q) => q.warranty_period || "—"],
  ["Shipping cost", (q) => (q.shipping_cost != null ? money(q.shipping_cost, q.currency) : "—")],
  ["Payment terms", (q) => q.payment_terms || "—"],
];

function CalculationRows({ quotes, params }) {
  return (
    <>
      {params.map((p) => (
        <tr key={p.key} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
          <td className={labelCell}>{p.name}</td>
          {quotes.map((q) => {
            const ps = q.parameterScores?.[p.key];
            return (
              <td key={q.id} className={cell} title={ps ? `min=${ps.min} max=${ps.max}` : "No data"}>
                {ps ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{ps.originalValue}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      n={ps.normalizedScore.toFixed(2)} w={ps.weight}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">contrib={ps.rawContribution.toFixed(2)}</span>
                  </div>
                ) : (
                  "—"
                )}
              </td>
            );
          })}
        </tr>
      ))}
      <tr className="bg-gray-50 dark:bg-gray-700/40 border-t border-gray-200 dark:border-gray-600">
        <td className={`${labelCell} font-bold`}>Final weighted sum</td>
        {quotes.map((q) => (
          <td key={q.id} className={`${cell} font-semibold`}>
            {q.totalWeights > 0 ? (
              <div className="flex flex-col items-center gap-0.5">
                <span>{q.rawWeightedSum.toFixed(2)}</span>
                <span className="text-gray-500 dark:text-gray-400">/ {q.totalWeights.toFixed(2)}</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">{Math.round(q.score)}%</span>
              </div>
            ) : (
              "—"
            )}
          </td>
        ))}
      </tr>
    </>
  );
}

export default function ComparisonTable({ quotes, params, view, hasWeights }) {
  return (
    <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm table-auto border-collapse bg-white dark:bg-gray-800">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Metric</th>
            {quotes.map((q, i) => (
              <th key={q.id} className="text-center py-3 px-2">
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-gray-900 dark:text-white text-xs" title={q.supplier_name || ""}>
                    {q.supplier_name?.split(" ")[0] || `S${i + 1}`}
                  </span>
                  {hasWeights && q.score != null && (
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">{Math.round(q.score)}%</span>
                  )}
                  <span className="text-xs italic text-gray-500">{INPUT_METHOD_LABELS[q.input_method] || "—"}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {view === "calculations" && hasWeights ? (
            <CalculationRows quotes={quotes} params={params} />
          ) : (
            OVERVIEW_ROWS.map(([label, render]) => (
              <tr key={label} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <td className={labelCell}>{label}</td>
                {quotes.map((q) => (
                  <td key={q.id} className={cell} style={{ whiteSpace: "normal" }}>
                    {render(q)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
