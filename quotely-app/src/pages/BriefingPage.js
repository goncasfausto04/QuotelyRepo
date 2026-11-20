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
    <div className="min-h-screen">
      <div className="bg-white dark:bg-gray-950">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-3">
          <Link to="/briefings" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
            ← All briefings
          </Link>
          <h1 className="page-title mt-1 truncate">{briefing.title || "Untitled Briefing"}</h1>
        </div>
      </div>

      <BriefingTabs active={tab} onChange={setTab} />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === "chat" && <BriefingChat briefingId={briefing.id} onGoToInbox={(view) => setTab("inbox", view)} />}

        {tab === "inbox" && (
          <>
            <TabIntro>
              Find suppliers on the map, send them your request, then approve their replies: the AI extracts prices and terms for comparison.
            </TabIntro>
            <BriefingInbox briefingId={briefing.id} />
          </>
        )}

        {tab === "analyze" && (
          <>
            <TabIntro>
              Paste a supplier's quote email or upload a PDF. The AI extracts pricing, timelines and terms and saves it for comparison.
            </TabIntro>
            <QuoteAnalysis briefingId={briefing.id} />
          </>
        )}

        {tab === "compare" && (
          <>
            <TabIntro>
              Every quote side by side in one currency, shipping included. The best value in each row is marked.
            </TabIntro>
            <ComparisonDashboard briefingId={briefing.id} />
          </>
        )}
      </div>
    </div>
  );
}
