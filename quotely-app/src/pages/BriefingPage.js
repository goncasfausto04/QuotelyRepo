// One briefing: chat -> inbox -> analyze -> compare. The tab lives in the URL (?tab=).

import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import BriefingChat from "../components/chat/BriefingChat.js";
import BriefingInbox from "../components/inbox/BriefingInbox.js";
import ComparisonDashboard from "../components/compare/ComparisonDashboard.js";
import QuoteAnalysis from "../components/analyze/QuoteAnalysis.js";
import BriefingTabs, { TABS } from "../components/briefing/BriefingTabs.js";
import TabIntro from "../components/briefing/TabIntro.js";
import { BriefingLoading, BriefingNotFound } from "../components/briefing/BriefingStates.js";

export default function BriefingPage() {
  const [params, setParams] = useSearchParams();
  const briefingId = params.get("briefing");
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "chat";
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!briefingId) return setLoading(false);
    setLoading(true);
    supabase
      .from("briefings")
      .select("id, title")
      .eq("id", briefingId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("Error fetching briefing:", error);
        setBriefing(data || null);
        setLoading(false);
      });
  }, [briefingId]);

  const setTab = (id, view) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    if (view) next.set("view", view);
    else next.delete("view");
    setParams(next, { replace: true });
    window.scrollTo({ top: 0 });
  };

  if (loading) return <BriefingLoading />;
  if (!briefing) return <BriefingNotFound />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link to="/briefings" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
            ← Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">{briefing.title || "Untitled Briefing"}</h1>
        </div>
      </div>

      <BriefingTabs active={tab} onChange={setTab} />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {tab === "chat" && <BriefingChat briefingId={briefing.id} onGoToInbox={(view) => setTab("inbox", view)} />}

        {tab === "inbox" && (
          <>
            <TabIntro color="blue" title="Inbox">
              Find suppliers on the map, send them your request, then approve their replies: the AI extracts prices and terms for comparison.
            </TabIntro>
            <BriefingInbox briefingId={briefing.id} />
          </>
        )}

        {tab === "analyze" && (
          <>
            <TabIntro color="purple" title="Add a quote manually">
              Paste a supplier's quote email or upload a PDF. The AI extracts pricing, timelines and terms and saves it for comparison.
            </TabIntro>
            <QuoteAnalysis briefingId={briefing.id} />
          </>
        )}

        {tab === "compare" && (
          <>
            <TabIntro color="green" title="Compare all quotes">
              All saved quotes side by side. Best prices and fastest delivery are highlighted.
            </TabIntro>
            <ComparisonDashboard briefingId={briefing.id} />
          </>
        )}
      </div>
    </div>
  );
}
