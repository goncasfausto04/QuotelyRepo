// Compare tab: summary cards, side-by-side table and personalised ranking.

import { useState } from "react";
import { BarChart3, Settings, Download, AlertCircle } from "lucide-react";
import useComparison from "./useComparison.js";
import { bestPrice, bestLeadTime, averagePrice } from "./scoring.js";
import SummaryCards from "./SummaryCards.js";
import ComparisonTable from "./ComparisonTable.js";
import QuoteCardsMobile from "./QuoteCardsMobile.js";
import PrioritiesPanel from "./PrioritiesPanel.js";
import { generateQuotesPDF } from "./pdf/index.js";

function EmptyState({ briefingId }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No quotes yet</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Approve a supplier reply in the Inbox, or add a quote manually.</p>
      {briefingId && (
        <div className="flex justify-center gap-3">
          <a href={`/briefingpage?briefing=${briefingId}&tab=inbox`} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">
            Go to Inbox
          </a>
          <a href={`/briefingpage?briefing=${briefingId}&tab=analyze`} className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-5 py-2 rounded-lg">
            Add manually
          </a>
        </div>
      )}
    </div>
  );
}

export default function ComparisonDashboard({ briefingId }) {
  const c = useComparison(briefingId);
  const [showConfig, setShowConfig] = useState(false);
  const [onlyComplete, setOnlyComplete] = useState(false);
  const [view, setView] = useState("overview");

  if (c.loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (c.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3 text-red-800 dark:text-red-200">
        <AlertCircle size={20} /> Couldn't load quotes: {c.error}
      </div>
    );
  }
  if (!c.quotes.length) return <EmptyState briefingId={briefingId} />;

  const hasWeights = !!c.weights;
  const title = c.quotes[0]?.briefings?.title;
  const shown = c.ranked.filter((q) => !onlyComplete || (q.warranty_months != null && q.lead_time_days != null));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-3">
              <BarChart3 className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quote analysis</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {c.quotes.length} {c.quotes.length === 1 ? "quote" : "quotes"}
                {title ? ` for "${title}"` : ""}
                {hasWeights ? " · 🎯 personalised" : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => generateQuotesPDF(c.ranked, title, c.weights, c.params)}
              className="flex items-center justify-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl hover:bg-orange-700 font-semibold"
            >
              <Download size={18} /> PDF
            </button>
            {hasWeights && (
              <button onClick={() => c.setWeights(null)} className="px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl">
                Reset priorities
              </button>
            )}
            <button
              onClick={() => setShowConfig((s) => !s)}
              disabled={c.params.length === 0}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              <Settings size={18} /> {hasWeights ? "Adjust priorities" : "Set priorities"}
            </button>
          </div>
        </div>
        <SummaryCards
          best={bestPrice(c.quotes)}
          fastest={bestLeadTime(c.quotes)}
          average={averagePrice(c.quotes)}
          topRanked={hasWeights ? c.ranked[0] : null}
          hasWeights={hasWeights}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              {["overview", "calculations"].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  disabled={v === "calculations" && !hasWeights}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize disabled:opacity-40 ${
                    view === v ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  title={v === "calculations" && !hasWeights ? "Set priorities first" : undefined}
                >
                  {v}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={onlyComplete} onChange={() => setOnlyComplete((s) => !s)} className="accent-blue-600" />
              Complete data only
            </label>
          </div>
          <div className="p-6">
            <ComparisonTable quotes={shown} params={c.params} view={view} hasWeights={hasWeights} />
            <QuoteCardsMobile quotes={shown} />
          </div>
        </div>

        <div className="lg:col-span-7">
          <PrioritiesPanel
            show={showConfig}
            params={c.params}
            weights={c.weights}
            onOpen={() => setShowConfig(true)}
            onApply={(w) => {
              c.setWeights(w);
              setShowConfig(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}
