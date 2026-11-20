// What the AI extracted from the quote that was just saved.

const money = (v, c) => (v == null ? "—" : `${c ? `${c} ` : ""}${Number(v).toLocaleString()}`);

export default function SavedQuoteSummary({ quote, compareHref }) {
  const rows = [
    ["Supplier", quote.supplier_name || "—"],
    ["Total price", money(quote.total_price, quote.currency)],
    ["Lead time", quote.lead_time_days != null ? `${quote.lead_time_days} days` : "—"],
    ["Warranty", quote.warranty_months != null ? `${quote.warranty_months} months` : quote.warranty_period || "—"],
    ["Shipping", money(quote.shipping_cost, quote.currency)],
    ["Payment", quote.payment_terms || "—"],
  ];
  return (
    <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">Quote saved</h4>
      <dl className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-gray-500 dark:text-gray-400">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <a href={compareHref} className="btn-primary w-full mt-4">
        Compare quotes →
      </a>
    </div>
  );
}
