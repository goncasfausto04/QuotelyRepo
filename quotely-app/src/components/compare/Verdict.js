// "At a glance": the three facts people actually want first.

import { formatMoney } from "./standardize.js";

function Fact({ label, name, value, sub }) {
  return (
    <div className="px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 font-semibold text-gray-900 dark:text-white truncate">{name || "—"}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 num">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Verdict({ quotes, ranked, currency, presetLabel }) {
  const priced = quotes.filter((q) => q.std.total != null);
  const cheapest = priced.reduce((a, b) => (a && a.std.total <= b.std.total ? a : b), null);
  const highest = priced.reduce((a, b) => (a && a.std.total >= b.std.total ? a : b), null);
  const timed = quotes.filter((q) => q.std.leadDays != null);
  const fastest = timed.reduce((a, b) => (a && a.std.leadDays <= b.std.leadDays ? a : b), null);
  const top = ranked[0]?.score != null ? ranked[0] : null;
  const savings = cheapest && highest && highest !== cheapest ? highest.std.total - cheapest.std.total : null;

  return (
    <div className="card grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-800">
      <Fact
        label="Lowest total"
        name={cheapest?.supplier_name}
        value={cheapest ? formatMoney(cheapest.std.total, currency) : "No prices yet"}
        sub={savings ? `${formatMoney(savings, currency)} less than the most expensive` : null}
      />
      <Fact label="Fastest delivery" name={fastest?.supplier_name} value={fastest ? `${fastest.std.leadDays} days` : "No delivery times yet"} />
      <Fact
        label={`Best overall · ${presetLabel}`}
        name={top?.supplier_name}
        value={top ? `${Math.round(top.score)} of 100 points` : "Needs 2+ comparable quotes"}
      />
    </div>
  );
}
