// Live summary of what the assistant has understood so far.

const FIELDS = [
  ["item", "Item"],
  ["quantity", "Quantity"],
  ["deadline", "Deadline"],
  ["delivery_location", "Delivery"],
  ["budget", "Budget"],
];

export default function RequirementsCard({ spec }) {
  if (!spec) return null;
  const rows = FIELDS.filter(([k]) => spec[k]).map(([k, label]) => [label, spec[k]]);
  const details = [...(spec.specifications || []), ...(spec.extras || [])];
  if (!rows.length && !details.length) return null;

  return (
    <div className="mb-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">What I've got so far</div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2 min-w-0">
            <dt className="text-gray-500 dark:text-gray-400 shrink-0">{label}:</dt>
            <dd className="text-gray-900 dark:text-gray-100 truncate" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {details.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {details.map((d) => (
            <span key={d} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
