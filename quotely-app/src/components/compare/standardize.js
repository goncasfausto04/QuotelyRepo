// Turns raw quotes into comparable numbers:
//   - every amount converted to one currency (ECB rates)
//   - total incl. shipping, price per unit, delivery days, warranty months
//   - flags for anything assumed or missing, shown as footnotes

const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const DAY = 86_400_000;

// Most common currency among priced quotes (ties -> EUR)
export function defaultCurrency(quotes) {
  const counts = {};
  for (const q of quotes) if (q.currency && num(q.total_price) != null) counts[q.currency.toUpperCase()] = (counts[q.currency.toUpperCase()] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || (a[0] === "EUR" ? -1 : 1))[0]?.[0] || "EUR";
}

// rates: { EUR: 1, USD: 1.08, ... } relative to EUR
export function makeConverter(rates, target) {
  return (amount, from) => {
    if (amount == null) return null;
    if (!from || from === target) return amount;
    if (!rates?.[from] || !rates?.[target]) return null; // unknown currency
    return (amount / rates[from]) * rates[target];
  };
}

export function standardizeQuote(q, convert, target) {
  const flags = [];
  const currency = q.currency ? q.currency.toUpperCase() : null;
  if (!currency) flags.push("currency not stated, assumed " + target);
  const from = currency || target;
  const money = (v) => convert(num(v), from);
  const price = money(q.total_price);
  if (currency && currency !== target) {
    flags.push(price == null && num(q.total_price) != null ? `no exchange rate for ${currency}` : `converted from ${currency}`);
  }
  const quantity = num(q.quantity);
  const shippingRaw = num(q.shipping_cost);
  const shipping = money(q.shipping_cost);
  if (price != null && shippingRaw == null) flags.push("shipping not stated");

  let leadDays = num(q.lead_time_days);
  if (leadDays == null && q.delivery_date) {
    const d = Math.ceil((new Date(q.delivery_date) - Date.now()) / DAY);
    if (d > 0) {
      leadDays = d;
      flags.push("delivery time from delivery date");
    }
  }

  const aj = q.analysis_json || {};
  const rating = num(aj.business_rating_value);
  return {
    price,
    shipping,
    total: price != null ? price + (shipping || 0) : null,
    unitPrice: money(q.unit_price) ?? (price != null && quantity ? price / quantity : null),
    quantity,
    leadDays,
    warrantyMonths: num(q.warranty_months),
    rating: rating != null ? (rating / (num(aj.business_rating_scale) || 5)) * 5 : null,
    paymentTerms: q.payment_terms || null,
    flags,
  };
}

export function standardizeAll(quotes, rates, target) {
  const convert = makeConverter(rates, target);
  return quotes.map((q) => ({ ...q, std: standardizeQuote(q, convert, target) }));
}

export const formatMoney = (v, currency) =>
  v == null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: v >= 100 ? 0 : 2 }).format(v);
