// Tiny CSS-only charts: vertical bars and horizontal bars.
import { Empty } from "./Card.js";

export function VerticalBars({ data, empty, barClass = "bg-blue-600" }) {
  if (!data.length) return <Empty>{empty}</Empty>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-between h-48 gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center min-w-0">
          <div className="w-full flex items-end h-40">
            <div className={`w-full rounded-sm ${barClass}`} style={{ height: `${(d.value / max) * 100}%` }} title={`${d.value}`} />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 truncate w-full text-center">{d.label}</p>
          <p className="text-xs font-semibold text-gray-900 dark:text-white">{d.value}</p>
        </div>
      ))}
    </div>
  );
}

export function HorizontalBars({ data, empty, format = (v) => v }) {
  if (!data.length) return <Empty>{empty}</Empty>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-4">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">{d.label}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100 num">{format(d.value)}</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
