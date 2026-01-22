import { useState, useCallback } from "react";
import {
  Info,
  Zap,
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
          weight: Math.max(0, Math.min(5, weightValue)), // Clamp between 0-5
          direction:
            availableParams.find((p) => p.key === key)?.direction || "lower", // fixed direction
        };
      });
      // Ensure any new parameters missing from saved weights get sensible defaults
      availableParams.forEach((param) => {
        if (!convertedWeights.hasOwnProperty(param.key)) {
          convertedWeights[param.key] = {
            enabled: true,
            weight: 1,
            direction: param.direction,
          };
        }
      });
      return convertedWeights;
    }

    // Default: all enabled with weight 1
    const defaultWeights = {};
    availableParams.forEach((param) => {
      defaultWeights[param.key] = {
        enabled: true,
        weight: 1, // Default importance
        direction: param.direction, // fixed direction
      };
    });
    return defaultWeights;
  };

  const [weights, setWeights] = useState(getInitialWeights);
  const [showTips, setShowTips] = useState(true);

  // Calculate total "weight power" for validation
  const enabledWeights = Object.values(weights).filter((w) => w.enabled);
  const hasEnabledWeights = enabledWeights.length > 0;

  // Update function without direction change
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

        if (typeof weightValue === "number") {
          const clampedValue = Math.max(0, Math.min(5, weightValue));
          newWeights[paramKey] = {
            ...newWeights[paramKey],
            weight: clampedValue,
          };
        }
      }

      // Removed direction update - direction is fixed and immutable

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

  // Apply weights
  const applyWeights = useCallback(() => {
    if (hasEnabledWeights && onWeightsApplied) {
      onWeightsApplied(weights);
    }
  }, [weights, hasEnabledWeights, onWeightsApplied]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
            <Scale className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
              Configure Comparison Priorities
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Set relative importance (0-5) for each factor in your quote
              comparison
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowTips(!showTips)}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
        >
          <Info size={18} />
          <span className="text-sm">Tips</span>
        </button>
      </div>

      {/* Tips */}
      {showTips && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Zap
              className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
              size={18}
            />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-2 dark:text-blue-100">
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
                  Example: Price=5, Warranty=1 means price is 5× more important
                  than warranty
                </li>
                <li>Use the slider to set importance levels</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Validation Status */}
      <div
        className={`mb-6 p-4 rounded-lg border-2 ${
          hasEnabledWeights
            ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800"
            : "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800"
        }`}
      >
        <div className="flex items-center gap-3">
          {hasEnabledWeights ? (
            <>
              <CheckCircle
                className="text-green-600 dark:text-green-400 flex-shrink-0"
                size={24}
              />
              <div>
                <h4 className="font-semibold text-green-800 dark:text-green-100">
                  Ready to Apply!
                </h4>
                <p className="text-green-600 dark:text-green-300 text-sm">
                  Weights configured. The system will calculate best overall
                  value based on your relative priorities.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle
                className="text-yellow-600 dark:text-yellow-400 flex-shrink-0"
                size={24}
              />
              <div>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-100">
                  Enable Factors
                </h4>
                <p className="text-yellow-600 dark:text-yellow-300 text-sm">
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

          // Remove direction UI
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
              className={`flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4 p-4 border-2 rounded-xl transition-all duration-200 ${
                config.enabled
                  ? "bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700 shadow-sm"
                  : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  updateWeight(param.key, { enabled: e.target.checked })
                }
                className="h-5 w-5 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded accent-blue-600 dark:accent-blue-500"
              />

              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <label
                    className={`font-semibold text-base sm:text-lg ${
                      config.enabled
                        ? "text-gray-800 dark:text-white"
                        : "text-gray-500 dark:text-gray-600"
                    }`}
                  >
                    {param.name || param.key.replace(/_/g, " ")}
                  </label>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${directionInfo.bg} ${directionInfo.color}`}
                    style={{ marginLeft: "auto", flexShrink: 0 }}
                  >
                    {directionInfo.icon} {directionInfo.label}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-xs sm:text-sm">
                    Available in {param.count} quotes
                  </span>
                  {param.description && (
                    <span className="text-xs text-gray-500 dark:text-gray-500 italic hidden sm:inline">
                      {param.description}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-64">
                <div className="flex items-center gap-3 sm:gap-4 mb-2">
                  <span
                    className={`text-xs sm:text-sm font-medium ${
                      config.enabled
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-400 dark:text-gray-600"
                    }`}
                  >
                    Importance:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-12 sm:w-16 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs sm:text-sm text-center bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold">
                      {config.weight}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      /5
                    </span>
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
                  className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed accent-blue-600 dark:accent-blue-500"
                />

                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>

                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
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
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={resetAllWeights}
            className="w-full sm:w-auto px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition flex items-center justify-center gap-2"
          >
            🔄 Reset All
          </button>

          <button
            onClick={equalizeWeights}
            className="w-full sm:w-auto px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2"
          >
            <Zap size={16} />
            Set All to 1 (Equal)
          </button>
        </div>

        <button
          onClick={applyWeights}
          disabled={!hasEnabledWeights}
          className={`w-full px-6 py-3 font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
            hasEnabledWeights
              ? "bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-800 shadow-md"
              : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-600 cursor-not-allowed"
          }`}
        >
          <CheckCircle size={18} />
          Apply Weights
        </button>
      </div>

      {/* Summary display */}
      {hasEnabledWeights && (
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="text-sm text-purple-800 dark:text-purple-200">
            <p className="font-semibold mb-1 dark:text-purple-100">
              Current Configuration:
            </p>
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
