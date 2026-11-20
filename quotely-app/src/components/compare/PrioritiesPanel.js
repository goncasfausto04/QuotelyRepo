// Right column: either the weight editor or an invitation to set priorities.

import { Settings, DollarSign, Clock, Award } from "lucide-react";
import WeightConfiguration from "./WeightConfiguration.js";

export default function PrioritiesPanel({ show, params, weights, onApply, onOpen }) {
  if (show && params.length > 0) {
    return <WeightConfiguration availableParams={params} onWeightsApplied={onApply} initialWeights={weights} />;
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 flex items-center gap-4">
        <Settings className="text-white" size={32} />
        <div>
          <h3 className="text-2xl font-bold text-white">Smart quote ranking</h3>
          <p className="text-blue-100">Tell us what matters most</p>
        </div>
      </div>
      <div className="p-8 max-w-lg mx-auto text-center">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            [DollarSign, "Price", "text-green-600"],
            [Clock, "Speed", "text-blue-600"],
            [Award, "Quality", "text-purple-600"],
          ].map(([Icon, label, color]) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <Icon className={`${color} mx-auto mb-2`} size={24} />
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Give each criterion a weight and quotes are ranked by what matters to you.
          {params.length === 0 && " You need at least two quotes with comparable numbers first."}
        </p>
        <button
          onClick={onOpen}
          disabled={params.length === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-8 rounded-xl hover:from-blue-700 hover:to-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Configure priorities
        </button>
      </div>
    </div>
  );
}
