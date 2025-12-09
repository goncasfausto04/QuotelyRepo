import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import BriefingChat from "../components/BriefingChat.js";
import ComparisonDashboard from "../components/ComparisonDashboard.js";
import QuoteAnalysis from "../components/QuoteAnalysis.js";
import BriefingInbox from "../components/BriefingInbox.js";

export default function BriefingPage() {
  const briefingId = new URLSearchParams(window.location.search).get("briefing");
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [generatedEmail, setGeneratedEmail] = useState("");

  useEffect(() => {
    async function fetchBriefing() {
      if (!briefingId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("briefings")
        .select("*")
        .eq("id", briefingId)
        .single();
      if (error) {
        console.error("Error fetching briefing:", error);
      } else {
        setBriefing(data);
      }
      setLoading(false);
    }
    fetchBriefing();
  }, [briefingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading briefing...
          </p>
        </div>
      </div>
    );
  }

  if (!briefingId || !briefing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md text-center border border-gray-200 dark:border-gray-700">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Briefing Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The briefing you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => (window.location.href = "/briefings")}
            className="inline-flex items-center gap-2 bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition"
          >
            ← Back to Briefings
          </button>
        </div>
      </div>
    );
  }

  // Tabs configuration - add inbox tab
  const tabs = [
    { id: "chat", label: "💬 Chat", description: "Create quote request" },
    { id: "analyze", label: "🔍 Analyze", description: "Extract quote data" },
    { id: "compare", label: "📊 Compare", description: "Compare all quotes" },
    { id: "inbox", label: "📥 Inbox", description: "Manage email replies" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row items-center sm:justify-between gap-4 sm:gap-0">
          <button
            onClick={() => (window.location.href = "/briefings")}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {briefing.title || "Untitled Briefing"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ID: {briefingId.slice(0, 8)}...
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium transition-all border-b-3 ${
                  activeTab === tab.id
                    ? "text-blue-600 dark:text-blue-400 border-b-4 border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <div className="text-base">{tab.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {tab.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "chat" && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <BriefingChat
                briefingId={briefing?.id}
                onEmailGenerated={setGeneratedEmail}
              />
            </div>
          </div>
        )}

        {activeTab === "analyze" && (
          <div>
            <div className="bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-400 dark:border-purple-600 rounded-r-lg p-4 mb-6">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                How it works:
              </h3>
              <p className="text-sm text-purple-800 dark:text-purple-200">
                1. Paste the complete supplier quote email
                <br />
                2. AI extracts pricing, timelines, and specifications
                <br />
                3. Data is saved automatically for comparison
              </p>
            </div>
            <QuoteAnalysis briefingId={briefing?.id} />
          </div>
        )}

        {activeTab === "compare" && (
          <div>
            <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 dark:border-green-600 rounded-r-lg p-4 mb-6">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Compare all quotes:
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                View all analyzed quotes side-by-side. Best prices and fastest
                delivery times are highlighted in green.
              </p>
            </div>
            <ComparisonDashboard briefingId={briefing?.id} />
          </div>
        )}

        {activeTab === "inbox" && (
          <div>
            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-600 rounded-r-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Email Inbox:
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                View all supplier replies, approve or reject quotes, and respond
                directly to suppliers.
              </p>
            </div>
            <BriefingInbox
              briefingId={briefing?.id}
              generatedEmail={generatedEmail}
            />
          </div>
        )}
      </div>
    </div>
  );
}
