// Pick what matters: presets, or custom weights.

import { PRESETS } from "./scoring.js";

const OPTIONS = [...Object.entries(PRESETS).map(([id, p]) => [id, p.label]), ["custom", "Custom…"]];

export default function RankingControls({ preset, onPreset, disabled }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">Rank by</span>
      <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden">
        {OPTIONS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => onPreset(id)}
            disabled={disabled}
            className={`px-3 py-1.5 text-sm border-r last:border-r-0 border-gray-300 dark:border-gray-700 disabled:opacity-50 ${
              preset === id ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
