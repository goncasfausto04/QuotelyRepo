// One criterion: enable checkbox + importance slider (0-5).

export default function WeightRow({ param, config, onChange }) {
  const higher = config.direction === "higher";
  return (
    <div
      className={`flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4 p-4 border-2 rounded-xl transition ${
        config.enabled ? "bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700" : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60"
      }`}
    >
      <input type="checkbox" checked={config.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="h-5 w-5 accent-blue-600" aria-label={`Use ${param.name}`} />

      <div className="flex-1 min-w-0 w-full">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-gray-800 dark:text-white">{param.name}</span>
          <span className={`ml-auto text-xs px-2 py-1 rounded-full ${higher ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
            {higher ? "↗ Higher is better" : "↘ Lower is better"}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          In {param.count} quotes · {param.description}
        </p>
      </div>

      <div className="w-full lg:w-56">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-300">Importance</span>
          <span className="font-semibold text-gray-800 dark:text-gray-100">{config.weight}/5</span>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={config.weight}
          onChange={(e) => onChange({ weight: parseFloat(e.target.value) })}
          disabled={!config.enabled}
          className="w-full accent-blue-600 disabled:opacity-50"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Ignore</span>
          <span>Standard</span>
          <span>5×</span>
        </div>
      </div>
    </div>
  );
}
