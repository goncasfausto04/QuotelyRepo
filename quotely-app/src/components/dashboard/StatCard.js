// A number with a label. Icons/colours are accepted for compatibility but kept quiet.
export default function StatCard({ label, value, unit, footer }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white num truncate">
        {value}
        {unit && <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>}
      </p>
      {footer && <p className="mt-1 text-xs text-gray-500 truncate">{footer}</p>}
    </div>
  );
}
