// Editor for comparison priorities. Weight 1 = standard, 5 = five times as important.

import { useState } from "react";
import { Info, Zap, CheckCircle, Scale } from "lucide-react";
import WeightRow from "./WeightRow.js";
import { initialWeights, defaultWeights, setAllWeights } from "./weights.js";

export default function WeightConfiguration({ availableParams, onWeightsApplied, initialWeights: saved }) {
  const [weights, setWeights] = useState(() => initialWeights(availableParams, saved));
  const [showTips, setShowTips] = useState(false);
  const canApply = Object.values(weights).some((w) => w.enabled && w.weight > 0);

  const update = (key, changes) => setWeights((w) => ({ ...w, [key]: { ...w[key], ...changes } }));

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
            <Scale className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">What matters most?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Set how important each factor is (0-5)</p>
          </div>
        </div>
        <button onClick={() => setShowTips((s) => !s)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
          <Info size={16} /> How it works
        </button>
      </div>

      {showTips && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-5 text-sm text-blue-800 dark:text-blue-200">
          Each quote gets 0-100% per factor (best quote = 100%, worst = 0%). Those are combined using your weights:
          0 ignores a factor, 1 is standard, 5 makes it five times as important. Example: price 5 and warranty 1 means price counts five
          times more than warranty.
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {availableParams.map((p) =>
          weights[p.key] ? <WeightRow key={p.key} param={p} config={weights[p.key]} onChange={(c) => update(p.key, c)} /> : null,
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <button onClick={() => setWeights(defaultWeights(availableParams))} className="btn-ghost">Reset all
        </button>
        <button
          onClick={() => setWeights((w) => setAllWeights(w, 1))}
          className="btn-secondary"
        >
          <Zap size={16} /> All equal
        </button>
        <button
          onClick={() => canApply && onWeightsApplied(weights)}
          disabled={!canApply}
          className="btn-primary sm:ml-auto"
        >
          <CheckCircle size={18} /> Apply
        </button>
      </div>
      {!canApply && <p className="text-xs text-amber-600 mt-2">Enable at least one factor with importance above 0.</p>}
    </div>
  );
}
