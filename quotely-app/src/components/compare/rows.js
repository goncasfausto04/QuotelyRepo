// The comparison table rows: how to read, format and compare each value.
// better: "lower" | "higher" | null (not compared)

import { formatMoney } from "./standardize.js";
import { INPUT_METHOD_LABELS, formatBusinessRating } from "./scoring.js";

const pct = (v, best) => (best ? Math.round(((v - best) / best) * 100) : 0);

export const ROWS = [
  {
    key: "total",
    label: "Total incl. shipping",
    hint: "Quoted price plus shipping, converted to one currency",
    better: "lower",
    primary: true,
    get: (q) => q.std.total,
    format: (v, cur) => formatMoney(v, cur),
    delta: (v, best) => `+${pct(v, best)}%`,
  },
  { key: "price", label: "Quoted price", better: "lower", get: (q) => q.std.price, format: (v, cur) => formatMoney(v, cur), delta: (v, best) => `+${pct(v, best)}%` },
  {
    key: "shipping",
    label: "Shipping",
    better: "lower",
    get: (q) => q.std.shipping,
    format: (v, cur) => (v === 0 ? "Included" : formatMoney(v, cur)),
    delta: (v, best, cur) => `+${formatMoney(v - best, cur)}`,
  },
  {
    key: "unit",
    label: "Price per unit",
    better: "lower",
    get: (q) => q.std.unitPrice,
    format: (v, cur) => formatMoney(v, cur),
    delta: (v, best) => `+${pct(v, best)}%`,
  },
  { key: "qty", label: "Quantity", better: null, get: (q) => q.std.quantity, format: (v) => (v == null ? "—" : v.toLocaleString()) },
  {
    key: "lead",
    label: "Delivery time",
    better: "lower",
    get: (q) => q.std.leadDays,
    format: (v) => (v == null ? "—" : `${v} day${v === 1 ? "" : "s"}`),
    delta: (v, best) => `+${v - best} days`,
  },
  {
    key: "warranty",
    label: "Warranty",
    better: "higher",
    get: (q) => q.std.warrantyMonths,
    format: (v) => (v == null ? "—" : v >= 12 && v % 12 === 0 ? `${v / 12} year${v === 12 ? "" : "s"}` : `${v} months`),
    delta: (v, best) => `−${best - v} months`,
  },
  {
    key: "rating",
    label: "Supplier rating",
    better: "higher",
    get: (q) => q.std.rating,
    format: (v, cur, q) => (v == null ? "—" : formatBusinessRating(q)?.text || `${v.toFixed(1)}/5`),
  },
  { key: "payment", label: "Payment terms", better: null, text: true, get: (q) => q.std.paymentTerms, format: (v) => v || "—" },
  { key: "source", label: "Received via", better: null, text: true, get: (q) => INPUT_METHOD_LABELS[q.input_method] || null, format: (v) => v || "—" },
];

// Hide rows where nobody has a value
export const visibleRows = (quotes) => ROWS.filter((r) => quotes.some((q) => r.get(q) != null));
