// Compare tab: what's cheapest, fastest and best overall, then every quote
// side by side in one currency with the best value of each row marked.

import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import useComparison from "./useComparison.js";
import Verdict from "./Verdict.js";
import RankingControls from "./RankingControls.js";
import ComparisonTable from "./ComparisonTable.js";
import QuoteCardsMobile from "./QuoteCardsMobile.js";
import WeightConfiguration from "./WeightConfiguration.js";
import { generateQuotesPDF } from "./pdf/index.js";
import Notice from "../ui/Notice.js";

function EmptyState({ briefingId }) {
  return (
    <div className="card p-10 text-center">
      <h3 className="section-title mb-1">No quotes yet</h3>
      <p className="muted mb-5">Approve a supplier's reply in the Inbox, or add a quote yourself.</p>
      <div className="flex justify-center gap-2">
        <a href={`/briefingpage?briefing=${briefingId}&tab=inbox`} className="btn-primary">
          Open inbox
        </a>
        <a href={`/briefingpage?briefing=${briefingId}&tab=analyze`} className="btn-secondary">
          Add a quote
        </a>
      </div>
    </div>
  );
}

export default function ComparisonDashboard({ briefingId }) {
  const c = useComparison(briefingId);
  const [editing, setEditing] = useState(false);

  if (c.loading) return <div className="h-48 flex items-center justify-center muted">Loading quotes…</div>;
  if (c.error) return <Notice type="error">Couldn't load quotes: {c.error}</Notice>;
  if (!c.quotes.length) return <EmptyState briefingId={briefingId} />;

  const canRank = c.params.length > 0;
  const title = c.quotes[0]?.briefings?.title;

  const choosePreset = (id) => {
    if (id === "custom") {
      setEditing(true);
      return c.setRanking({ ...c.ranking, preset: "custom", custom: c.ranking.custom || c.weights });
    }
    setEditing(false);
    c.setRanking({ ...c.ranking, preset: id });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">
            {c.quotes.length} quote{c.quotes.length === 1 ? "" : "s"}
            {title ? <span className="text-gray-500 font-normal"> for {title}</span> : null}
          </h2>
          <p className="muted">
            All amounts in{" "}
            <select value={c.currency} onChange={(e) => c.setCurrency(e.target.value)} className="bg-transparent font-medium text-gray-900 dark:text-gray-100 underline decoration-dotted cursor-pointer">
              {c.currencies.map((cur) => (
                <option key={cur}>{cur}</option>
              ))}
            </select>
            {c.ratesDate ? ` · exchange rates from ${c.ratesDate} (ECB)` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={c.refresh} className="btn-ghost" title="Reload quotes">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => generateQuotesPDF(c.ranked, title, c.weights, c.params)} className="btn-secondary">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      <Verdict quotes={c.quotes} ranked={c.ranked} currency={c.currency} presetLabel={c.presetLabel} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RankingControls preset={c.ranking.preset} onPreset={choosePreset} disabled={!canRank} />
        {!canRank && <span className="muted">Ranking needs at least two quotes with prices or delivery times.</span>}
      </div>

      {editing && c.ranking.preset === "custom" && (
        <WeightConfiguration
          availableParams={c.params}
          initialWeights={c.ranking.custom}
          onWeightsApplied={(w) => {
            c.setRanking({ preset: "custom", custom: w });
            setEditing(false);
          }}
        />
      )}

      <div className="hidden md:block">
        <ComparisonTable quotes={c.ranked} currency={c.currency} ranked={canRank} />
      </div>
      <div className="md:hidden">
        <QuoteCardsMobile quotes={c.ranked} currency={c.currency} ranked={canRank} />
      </div>

      <p className="text-xs text-gray-500">
        Points: each quote is scored 0-100 per criterion (best quote = 100, worst = 0) and combined with your priorities. Missing values
        don't count for or against a quote.
      </p>
    </div>
  );
}
