// src/components/WeightConfiguration.js
import { useState, useCallback } from "react";
import {
  Info,
  Zap,
  Target,
  CheckCircle,
  AlertCircle,
  Scale,
} from "lucide-react";

export default function WeightConfiguration({
  availableParams,
  onWeightsApplied,
  initialWeights,
}) {
  // Initialize weights with saved weights or default (all 1)
  const getInitialWeights = () => {
    if (initialWeights) {
      // Convert any old percentage weights (0-100) to new scale (0-5)
      const convertedWeights = {};
      Object.keys(initialWeights).forEach((key) => {
        const oldConfig = initialWeights[key];
        let weightValue = oldConfig.weight;

        // If weight is from old percentage system (0-100), convert to 0-5 scale
        if (weightValue > 5) {
          weightValue = Math.round((weightValue / 100) * 5 * 2) / 2; // Convert to 0-5 scale with 0.5 steps
        }

        convertedWeights[key] = {
          enabled: oldConfig.enabled,
          weight: Math.max(0, Math.min(5, weightValue)), // Ensure between 0-5
          direction: oldConfig.direction,
        };
      });
      return convertedWeights;
    }

    // Default: all enabled with weight 1
    const defaultWeights = {};
    availableParams.forEach((param) => {
      defaultWeights[param.key] = {
        enabled: true,
        weight: 1, // Default to 1 (equal importance)
        direction: param.direction,
      };
    });
    return defaultWeights;
  };

  const [weights, setWeights] = useState(getInitialWeights);
  const [showTips, setShowTips] = useState(true);

  // Calculate total "weight power" for validation
  const enabledWeights = Object.values(weights).filter((w) => w.enabled);
  const hasEnabledWeights = enabledWeights.length > 0;

  // Stable update function for the new 0-5 scale
  const updateWeight = useCallback((paramKey, updates) => {
    setWeights((prev) => {
      const newWeights = { ...prev };

      if (updates.hasOwnProperty("enabled")) {
        newWeights[paramKey] = {
          ...newWeights[paramKey],
          enabled: updates.enabled,
        };
      }

      if (updates.hasOwnProperty("weight")) {
        let weightValue = updates.weight;

        // Only accept numbers, no empty strings or text
        if (typeof weightValue === "number") {
          // Clamp between 0 and 5 for the new scale
          const clampedValue = Math.max(0, Math.min(5, weightValue));
          newWeights[paramKey] = {
            ...newWeights[paramKey],
            weight: clampedValue,
          };
        }
      }

      if (updates.hasOwnProperty("direction")) {
        newWeights[paramKey] = {
          ...newWeights[paramKey],
          direction: updates.direction,
        };
      }

      return newWeights;
    });
  }, []);

  // Equalize function - set all enabled weights to 1
  const equalizeWeights = useCallback(() => {
    setWeights((prev) => {
      const equalized = { ...prev };
      Object.keys(equalized).forEach((key) => {
        if (equalized[key].enabled) {
          equalized[key].weight = 1;
        }
      });
      return equalized;
    });
  }, []);

  // Reset all weights to 1 (including re-enabling disabled ones)
  const resetAllWeights = useCallback(() => {
    const resetWeights = {};
    availableParams.forEach((param) => {
      resetWeights[param.key] = {
        enabled: true,
        weight: 1,
        direction: param.direction,
      };
    });
    setWeights(resetWeights);
  }, [availableParams]);

  // Apply function
  const applyWeights = useCallback(() => {
    if (hasEnabledWeights && onWeightsApplied) {
      onWeightsApplied(weights);
    }
  }, [weights, hasEnabledWeights, onWeightsApplied]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Scale className="text-purple-600" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Configure Comparison Priorities
            </h3>
            <p className="text-sm text-gray-600">
              Set relative importance (0-5) for each factor in your quote
              comparison
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowTips(!showTips)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition"
        >
          <Info size={18} />
          <span className="text-sm">Tips</span>
        </button>
      </div>

      {/* Tips Panel */}
      {showTips && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Zap className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-2">
                How to configure relative importance:
              </p>
              <ul className="space-y-1">
                <li>
                  • <strong>0</strong> = Ignore this factor completely
                </li>
                <li>
                  • <strong>1</strong> = Standard importance (baseline)
                </li>
                <li>
                  • <strong>2</strong> = 2× more important than baseline
                </li>
                <li>
                  • <strong>3</strong> = 3× more important than baseline
                </li>
                <li>
                  • <strong>4</strong> = 4× more important than baseline
                </li>
                <li>
                  • <strong>5</strong> = 5× more important than baseline
                </li>
                <li>
                  • Example: Price=5, Warranty=1 means price is 5× more
                  important than warranty
                </li>
                <li>• Use the slider to set importance levels</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Validation Status */}
      <div
        className={`mb-6 p-4 rounded-lg border-2 ${
          hasEnabledWeights
            ? "bg-green-50 border-green-200"
            : "bg-yellow-50 border-yellow-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {hasEnabledWeights ? (
            <>
              <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
              <div>
                <h4 className="font-semibold text-green-800">
                  Ready to Apply!
                </h4>
                <p className="text-green-600 text-sm">
                  Weights configured. The system will calculate best overall
                  value based on your relative priorities.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle
                className="text-yellow-600 flex-shrink-0"
                size={24}
              />
              <div>
                <h4 className="font-semibold text-yellow-800">
                  Enable Factors
                </h4>
                <p className="text-yellow-600 text-sm">
                  Enable at least one factor to create a personalized
                  comparison.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Parameters List */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {availableParams.map((param) => {
          const config = weights[param.key];
          if (!config) return null;

          const directionInfo =
            config.direction === "higher"
              ? {
                  icon: "↗",
                  color: "text-green-600",
                  bg: "bg-green-100",
                  label: "Higher is better",
                }
              : {
                  icon: "↘",
                  color: "text-blue-600",
                  bg: "bg-blue-100",
                  label: "Lower is better",
                };

          return (
            <div
              key={param.key}
              className={`flex items-center gap-4 p-4 border-2 rounded-xl transition-all duration-200 ${
                config.enabled
                  ? "bg-white border-blue-200 shadow-sm"
                  : "bg-gray-50 border-gray-200 opacity-60"
              }`}
            >
              {/* Enable/Disable Toggle */}
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  updateWeight(param.key, { enabled: e.target.checked })
                }
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />

              {/* Parameter Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <label
                    className={`font-semibold text-lg ${
                      config.enabled ? "text-gray-800" : "text-gray-500"
                    }`}
                  >
                    {param.name || param.key.replace(/_/g, " ")}
                  </label>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${directionInfo.bg} ${directionInfo.color}`}
                  >
                    {directionInfo.icon} {directionInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Available in {param.count} quotes</span>
                  {param.description && (
                    <span className="text-xs text-gray-500 italic">
                      {param.description}
                    </span>
                  )}

                  <select
                    value={config.direction}
                    onChange={(e) =>
                      updateWeight(param.key, { direction: e.target.value })
                    }
                    className={`border rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 ${
                      !config.enabled ? "bg-gray-100 text-gray-400" : "bg-white"
                    }`}
                    disabled={!config.enabled}
                  >
                    <option value="higher">↑ Higher is better</option>
                    <option value="lower">↓ Lower is better</option>
                  </select>
                </div>
              </div>

              {/* Weight Control - READ-ONLY DISPLAY AND SLIDER ONLY */}
              <div className="w-64">
                <div className="flex items-center gap-4 mb-2">
                  <span
                    className={`text-sm font-medium ${
                      config.enabled ? "text-gray-700" : "text-gray-400"
                    }`}
                  >
                    Importance:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center bg-gray-50 text-gray-700 font-semibold">
                      {config.weight}
                    </span>
                    <span className="text-sm text-gray-500">/5</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={config.weight}
                  onChange={(e) =>
                    updateWeight(param.key, {
                      weight: parseFloat(e.target.value),
                    })
                  }
                  disabled={!config.enabled}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
                />

                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>

                {/* Importance Level Labels */}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span className="text-center">Ignore</span>
                  <span className="text-center">Standard</span>
                  <span className="text-center">5×</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={resetAllWeights}
            className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
          >
            🔄 Reset All
          </button>

          <button
            onClick={equalizeWeights}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Zap size={16} />
            Set All to 1 (Equal)
          </button>
        </div>

        <button
          onClick={applyWeights}
          disabled={!hasEnabledWeights}
          className={`px-6 py-3 font-semibold rounded-lg transition flex items-center gap-2 ${
            hasEnabledWeights
              ? "bg-green-600 text-white hover:bg-green-700 shadow-md"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          <CheckCircle size={18} />
          Apply Weights
        </button>
      </div>

      {/* Simple Summary Display */}
      {hasEnabledWeights && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-sm text-purple-800">
            <p className="font-semibold mb-1">Current Configuration:</p>
            <p>
              Weights represent relative importance multipliers. The system will
              calculate scores based on these ratios.
            </p>
            {Object.entries(weights).some(
              ([key, config]) => config.enabled && config.weight > 1
            ) && (
              <p className="text-xs mt-1">
                <strong>Example:</strong> A weight of 5 means that factor is 5×
                more influential than a factor with weight 1.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
